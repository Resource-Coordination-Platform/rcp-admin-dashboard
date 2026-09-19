"use client";

import { useState } from "react";
import { AlertCircle, Megaphone, ShieldAlert } from "lucide-react";
import { useBroadcastAlert } from "@/lib/hooks";
import type { AlertSeverity } from "@/lib/types";
import { ApiError } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

export function BroadcastAlertModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const broadcastMutation = useBroadcastAlert();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<AlertSeverity>("HIGH");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !message.trim()) {
      setError("Please fill out both title and alert message.");
      return;
    }

    try {
      await broadcastMutation.mutateAsync({
        title: title.trim(),
        message: message.trim(),
        severity,
      });

      toast.success(
        "Alert Broadcasted",
        `Emergency alert "${title}" broadcasted successfully.`,
      );
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Failed to broadcast alert. Please check gateway connection.");
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Publish Emergency Disaster Alert"
      description="Broadcast high-priority emergency alerts to mobile field personnel and victims (Tenant Isolated)."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <Field
          label="Alert Title"
          required
          hint="e.g. Flash Flood Warning - Kelani River Basin"
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Kelani River Rising Water Level Alert"
            required
          />
        </Field>

        <Field label="Severity Level" required>
          <Select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as AlertSeverity)}
          >
            <option value="HIGH">🚨 HIGH - Severe Threat (Red Alert)</option>
            <option value="MEDIUM">
              🟧 MEDIUM - Advisory / Warning (Orange Alert)
            </option>
            <option value="LOW">🟩 LOW - Informational (Green Alert)</option>
          </Select>
        </Field>

        <Field
          label="Broadcast Message Body"
          required
          hint="Instructions or evacuation guidance for ground teams"
        >
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Water levels have exceeded warning threshold. All residents in Low-lying Kolonnawa area are advised to move to designated relief shelters..."
            rows={4}
            required
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={broadcastMutation.isPending}
            variant="danger"
          >
            <Megaphone className="h-4 w-4" />
            Broadcast Alert Now
          </Button>
        </div>
      </form>
    </Modal>
  );
}
