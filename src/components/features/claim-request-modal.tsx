"use client";

import { useState } from "react";
import { AlertCircle, FilePlus2, ListChecks } from "lucide-react";
import { useCategories, useClaimRequest } from "@/lib/hooks";
import type { HelpRequestRead } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Button, Input, Select } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { formatRequestLocation } from "@/lib/format";

interface ClaimRequestModalProps {
  request: HelpRequestRead;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ClaimRequestModal({
  request,
  isOpen,
  onClose,
  onSuccess,
}: ClaimRequestModalProps) {
  const [categoryId, setCategoryId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [urgency, setUrgency] = useState<string>("medium");
  
  const categories = useCategories(false); // active only
  const claim = useClaimRequest();
  const toast = useToast();

  const handleClaim = async () => {
    if (!categoryId) {
      toast.error("Validation Error", "Please select a resource category");
      return;
    }

    try {
      await claim.mutateAsync({
        victim_request_id: request.id,
        category_id: categoryId,
        quantity_needed: quantity,
        urgency: urgency,
      });
      toast.success("Success", "Request claimed successfully!");
      onSuccess?.();
      onClose();
    } catch (e: any) {
      toast.error("Error", e.message || "Failed to claim request");
    }
  };

  const needsStr = (request as any).needs?.join(", ") || "";

  return (
    <Modal open={isOpen} onClose={onClose} title="Claim Global Request">
      <div className="space-y-6">
        <div className="rounded-lg bg-indigo-50/50 p-4 border border-indigo-100">
          <h3 className="font-medium text-indigo-900 mb-2">Request Details</h3>
          <dl className="grid grid-cols-1 gap-2 text-sm text-indigo-800">
            <div>
              <dt className="font-semibold inline mr-1">Disaster Type:</dt>
              <dd className="inline capitalize">{request.disaster_type || "N/A"}</dd>
            </div>
            <div>
              <dt className="font-semibold inline mr-1">Requested Needs:</dt>
              <dd className="inline">{needsStr || "N/A"}</dd>
            </div>
            <div>
              <dt className="font-semibold inline mr-1">Location:</dt>
              <dd className="inline">{formatRequestLocation(request)}</dd>
            </div>
            <div>
              <dt className="font-semibold inline mr-1">Description:</dt>
              <dd className="inline">{request.description || "No description provided."}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Resource Category
            </label>
            <Select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="" disabled>
                Select matching inventory category...
              </option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <p className="text-xs text-slate-500">
              Map the requested needs to a category from your inventory.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Quantity Needed
              </label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Urgency
              </label>
              <Select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleClaim}
            disabled={claim.isPending || !categoryId}
          >
            <FilePlus2 className="w-4 h-4 mr-2" />
            {claim.isPending ? "Claiming..." : "Claim Request"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
