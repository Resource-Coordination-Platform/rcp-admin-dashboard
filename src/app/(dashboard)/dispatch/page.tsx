"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, Card, EmptyState, Skeleton, Select } from "@/components/ui/primitives";
import { useTasks, useUpdateTaskStatus } from "@/lib/hooks";
import { formatDateTime } from "@/lib/format";
import { Truck, Search, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function DispatchPage() {
  const { data: tasks, isLoading, error } = useTasks();
  const updateStatus = useUpdateTaskStatus();
  const toast = useToast();

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ taskId, status: newStatus });
      toast.success("Task updated", "Status changed successfully.");
    } catch (err: any) {
      toast.error("Failed to update task", err.detail || "Unexpected error");
    }
  };

  const statusOptions = [
    { value: "assigned", label: "Assigned" },
    { value: "accepted", label: "Accepted" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "declined", label: "Declined" },
    { value: "cancelled", label: "Cancelled" },
  ];

  function StatusBadge({ status }: { status: string }) {
    switch (status) {
      case "assigned":
      case "accepted":
        return <Badge tone="neutral">{status}</Badge>;
      case "in_progress":
        return <Badge tone="brand">{status}</Badge>;
      case "completed":
        return <Badge tone="success">{status}</Badge>;
      case "declined":
      case "cancelled":
        return <Badge tone="danger">{status}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }

  return (
    <div>
      <PageHeader
        title="Volunteer Dispatch & Tasks"
        description="View and manage tasks assigned to volunteers across all requests."
      />

      {error ? (
        <Card>
          <EmptyState
            icon={AlertCircle}
            title="Failed to load tasks"
            description="Could not fetch tasks from the logistics service."
          />
        </Card>
      ) : isLoading ? (
        <div className="grid gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : !tasks || tasks.length === 0 ? (
        <Card>
          <EmptyState
            icon={Truck}
            title="No tasks assigned yet"
            description="Tasks are created when you dispatch volunteers to help requests."
          />
        </Card>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task: any) => (
            <Card key={task.id} className="p-5 flex flex-col md:flex-row gap-4 items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{task.title}</h3>
                  <StatusBadge status={task.status} />
                </div>
                
                <div className="text-sm text-slate-600">
                  <p><strong>Volunteer:</strong> {task.volunteer_name}</p>
                  <p><strong>Request:</strong> {task.request_description || "N/A"}</p>
                  {task.request_area && <p><strong>Area:</strong> {task.request_area}</p>}
                </div>
                
                {task.instructions && (
                  <p className="text-sm text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                    <strong>Instructions:</strong> {task.instructions}
                  </p>
                )}
                
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Created: {formatDateTime(task.created_at)}
                  </span>
                  {task.accepted_at && (
                    <span className="flex items-center gap-1 text-blue-500">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Accepted: {formatDateTime(task.accepted_at)}
                    </span>
                  )}
                  {task.completed_at && (
                    <span className="flex items-center gap-1 text-emerald-500">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Completed: {formatDateTime(task.completed_at)}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="w-full md:w-48 shrink-0">
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Update Status</label>
                <Select 
                  value={task.status} 
                  onChange={(e) => handleStatusChange(task.id, e.target.value)}
                  disabled={updateStatus.isPending}
                >
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
