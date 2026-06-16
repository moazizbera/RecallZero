"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Check,
  Download,
  Loader2,
  Plus,
  ShieldAlert,
  SquarePen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { validateIncidentSignal } from "@/lib/intake-quality"
import type { Incident, Posture } from "@/lib/types"
import { postureLabel } from "@/lib/ui-helpers"

const POSTURES: Posture[] = ["ACTIVATE", "HOLD", "REJECT"]

export function IncidentActions({
  incident,
  onChanged,
}: {
  incident: Incident
  onChanged: () => Promise<unknown>
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [overrideTo, setOverrideTo] = useState<Posture>(
    incident.decision.posture === "ACTIVATE" ? "HOLD" : "ACTIVATE",
  )
  const [reason, setReason] = useState("")

  const [followOpen, setFollowOpen] = useState(false)
  const [followSignal, setFollowSignal] = useState("")

  async function act(action: string, body?: Record<string, unknown>) {
    setBusy(action)
    try {
      const res = await fetch(`/api/incidents/${incident.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Action failed")
      await onChanged()
      return true
    } catch (err) {
      toast.error((err as Error).message)
      return false
    } finally {
      setBusy(null)
    }
  }

  async function submitOverride() {
    if (!reason.trim()) {
      toast.error("A written justification is required to override the AI.")
      return
    }
    const ok = await act("override", { overrideTo, reason })
    if (ok) {
      toast.success(`Recommendation overridden to ${postureLabel(overrideTo)}.`)
      setOverrideOpen(false)
      setReason("")
    }
  }

  async function submitFollowUp() {
    if (followSignal.trim().length < 10) {
      toast.error("Please provide a more complete follow-up signal.")
      return
    }
    const quality = validateIncidentSignal(followSignal, { followUp: true })
    if (!quality.ok) {
      toast.error(quality.error || "Please provide recall-relevant follow-up evidence.")
      return
    }
    setBusy("follow")
    try {
      const res = await fetch(`/api/incidents/${incident.id}/signals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal: followSignal }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not process signal")
      await onChanged()
      if (data.moved) {
        toast.success(
          `New evidence changed the call: ${postureLabel(data.previousPosture)} → ${postureLabel(
            data.incident.decision.posture,
          )}.`,
        )
      } else {
        toast.success("New signal folded in. Posture held; confidence updated.")
      }
      setFollowOpen(false)
      setFollowSignal("")
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  function exportPacket() {
    setBusy("export")
    // Trigger a download, then refresh to surface the logged export event.
    window.open(`/api/incidents/${incident.id}/export`, "_blank")
    setTimeout(async () => {
      await onChanged()
      setBusy(null)
      toast.success("Audit packet exported and logged to the trail.")
    }, 800)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Operator actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={incident.acknowledged ? "secondary" : "default"}
            disabled={busy !== null || incident.acknowledged}
            onClick={async () => {
              const ok = await act("acknowledge")
              if (ok) toast.success("Recommendation acknowledged.")
            }}
          >
            {busy === "acknowledge" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {incident.acknowledged ? "Acknowledged" : "Acknowledge"}
          </Button>

          <Button
            size="sm"
            variant="secondary"
            disabled={busy !== null}
            onClick={() => setOverrideOpen(true)}
          >
            <SquarePen className="h-4 w-4" />
            Override
          </Button>

          <Button
            size="sm"
            variant="secondary"
            disabled={busy !== null || incident.status === "ESCALATED"}
            onClick={async () => {
              const ok = await act("escalate")
              if (ok) toast.success("Escalated to the recall committee.")
            }}
          >
            {busy === "escalate" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldAlert className="h-4 w-4" />
            )}
            Escalate
          </Button>

          <Button
            size="sm"
            variant="secondary"
            disabled={busy !== null}
            onClick={() => setFollowOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add signal
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={exportPacket}
          >
            {busy === "export" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export audit packet
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Every action is timestamped and written to the immutable audit trail in DynamoDB.
          Overrides require a written justification.
        </p>
      </CardContent>

      {/* Override dialog */}
      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override the AI recommendation</DialogTitle>
            <DialogDescription>
              The engine recommends {postureLabel(incident.decision.posture)}. Overriding is logged
              with your name and justification for regulatory defensibility.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="override-to">Override to</Label>
              <Select value={overrideTo} onValueChange={(v) => setOverrideTo(v as Posture)}>
                <SelectTrigger id="override-to">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSTURES.filter((p) => p !== incident.decision.posture).map((p) => (
                    <SelectItem key={p} value={p}>
                      {postureLabel(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="reason">Justification (required)</Label>
              <Textarea
                id="reason"
                rows={3}
                placeholder="e.g. Plant QA confirmed the lot was quarantined before shipment; recall not warranted."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOverrideOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitOverride} disabled={busy === "override"}>
              {busy === "override" && <Loader2 className="h-4 w-4 animate-spin" />}
              Record override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up signal dialog */}
      <Dialog open={followOpen} onOpenChange={setFollowOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a follow-up signal</DialogTitle>
            <DialogDescription>
              Real incidents evolve. Paste new evidence (a lab result, a second complaint, a
              supplier update) and RecallZero re-evaluates the full picture.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              rows={5}
              placeholder="e.g. Lab confirmed 8 ppm peanut protein in retained sample of lot NR-GRN-4471. Two additional consumer reactions logged overnight."
              value={followSignal}
              onChange={(e) => setFollowSignal(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFollowOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitFollowUp} disabled={busy === "follow"}>
              {busy === "follow" && <Loader2 className="h-4 w-4 animate-spin" />}
              Re-evaluate with new signal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
