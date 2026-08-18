// Client-side mirror of services/logistics/app/services/workflow.py.
//
// Two jobs:
//  1. `allowedNext` decides which status buttons a coordinator actually sees.
//     The backend rejects any other transition, so deriving this from the
//     request's category — instead of a hardcoded map — is what makes the
//     workflow engine "customizable" from the operator's side.
//  2. `validateWorkflow` reproduces the server's rules so an admin building a
//     flow gets the error next to the control that caused it, rather than a
//     422 after hitting Save.

import {
  DEFAULT_INITIAL_STATUS,
  DEFAULT_TRANSITIONS,
  REQUEST_STATUS_META,
  TERMINAL_STATUSES,
} from "./constants";
import type { RequestStatus, WorkflowDefinition } from "./types";

export function isTerminal(status: RequestStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function initialStatus(
  workflow: WorkflowDefinition | null | undefined,
): RequestStatus {
  return workflow?.initial ?? DEFAULT_INITIAL_STATUS;
}

/** The statuses this category permits moving to from `current`. */
export function allowedNext(
  workflow: WorkflowDefinition | null | undefined,
  current: RequestStatus,
): RequestStatus[] {
  const transitions = workflow?.transitions ?? DEFAULT_TRANSITIONS;
  return transitions[current] ?? [];
}

export function reachableFrom(
  initial: RequestStatus,
  transitions: Partial<Record<RequestStatus, RequestStatus[]>>,
): Set<RequestStatus> {
  const seen = new Set<RequestStatus>([initial]);
  const queue: RequestStatus[] = [initial];
  while (queue.length) {
    for (const target of transitions[queue.pop()!] ?? []) {
      if (!seen.has(target)) {
        seen.add(target);
        queue.push(target);
      }
    }
  }
  return seen;
}

const label = (s: RequestStatus) => REQUEST_STATUS_META[s].label;

/**
 * Same checks, same order as workflow.validate_definition. Returns the
 * problems as operator-readable sentences; empty means the server will accept
 * it.
 */
export function validateWorkflow(workflow: WorkflowDefinition): string[] {
  const errors: string[] = [];
  const { initial, transitions } = workflow;

  const sources = (Object.keys(transitions) as RequestStatus[]).filter(
    (s) => (transitions[s] ?? []).length > 0,
  );

  if (sources.length === 0) {
    return ["Add at least one transition, or switch back to the platform default."];
  }

  for (const source of sources) {
    if (isTerminal(source)) {
      errors.push(`“${label(source)}” is a final state and cannot lead anywhere.`);
    }
    if ((transitions[source] ?? []).includes(source)) {
      errors.push(`“${label(source)}” cannot transition to itself.`);
    }
  }

  if (!sources.includes(initial)) {
    errors.push(
      `The starting state “${label(initial)}” has no outgoing transitions — a request would be stuck the moment it is submitted.`,
    );
  }

  const reachable = reachableFrom(initial, transitions);
  const unreachable = sources.filter((s) => !reachable.has(s));
  if (unreachable.length > 0) {
    errors.push(
      `Unreachable from “${label(initial)}”: ${unreachable.map(label).join(", ")}.`,
    );
  }

  if (!TERMINAL_STATUSES.some((s) => reachable.has(s))) {
    errors.push(
      "No closing state (Fulfilled, Rejected or Cancelled) can be reached — requests on this category could never be closed.",
    );
  }

  return errors;
}

/** Drop empty sources so what we PATCH matches what the server normalises to. */
export function normalizeWorkflow(
  workflow: WorkflowDefinition,
): WorkflowDefinition {
  const transitions: Partial<Record<RequestStatus, RequestStatus[]>> = {};
  for (const [source, targets] of Object.entries(workflow.transitions) as [
    RequestStatus,
    RequestStatus[],
  ][]) {
    if (targets.length > 0) transitions[source] = targets;
  }
  return { initial: workflow.initial, transitions };
}

/** A fresh custom flow seeded from the platform default. */
export function defaultWorkflow(): WorkflowDefinition {
  return {
    initial: DEFAULT_INITIAL_STATUS,
    transitions: Object.fromEntries(
      Object.entries(DEFAULT_TRANSITIONS).map(([k, v]) => [k, [...v]]),
    ) as WorkflowDefinition["transitions"],
  };
}

/** Ordered walk of the flow for display: initial first, then by discovery. */
export function flowOrder(
  workflow: WorkflowDefinition | null | undefined,
): RequestStatus[] {
  const initial = initialStatus(workflow);
  const transitions = workflow?.transitions ?? DEFAULT_TRANSITIONS;
  const ordered: RequestStatus[] = [];
  const seen = new Set<RequestStatus>();
  const queue: RequestStatus[] = [initial];
  while (queue.length) {
    const state = queue.shift()!;
    if (seen.has(state)) continue;
    seen.add(state);
    ordered.push(state);
    queue.push(...(transitions[state] ?? []));
  }
  return ordered;
}
