"use client";

import { useState } from "react";
import { Check, Inbox, X } from "lucide-react";
import { reviewJoinRequest } from "@/app/_actions/club";
import { timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/buttons";
import { EmptyState } from "@/components/ui/misc";
import { useAction } from "@/components/ui/use-action";

type Request = { id: string; name: string; note: string | null; createdAt: string; reviewedAt: string | null; domainId: string; domainName: string; reviewer: string | null };

export function RequestList({ clubId, status, requests, domains }: { clubId: string; status: string; requests: Request[]; domains: { id: string; name: string }[] }) {
  if (requests.length === 0) {
    return (
      <div className="card">
        <EmptyState icon={Inbox} title={status === "pending" ? "Inbox zero" : `No ${status} requests`}>
          {status === "pending" ? "New requests from your public board will show up here." : "Reviewed requests appear here for reference."}
        </EmptyState>
      </div>
    );
  }
  return (
    <ul className="card divide-y divide-line">
      {requests.map((r) => (
        <RequestRow key={r.id} clubId={clubId} request={r} domains={domains} reviewable={status === "pending"} />
      ))}
    </ul>
  );
}

function RequestRow({ clubId, request, domains, reviewable }: { clubId: string; request: Request; domains: { id: string; name: string }[]; reviewable: boolean }) {
  const [pending, run] = useAction();
  const [domainId, setDomainId] = useState(request.domainId);
  const [choice, setChoice] = useState<boolean | null>(null);

  const review = (approve: boolean) => {
    setChoice(approve);
    void run(() => reviewJoinRequest({ clubId, requestId: request.id, approve, domainId }));
  };

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Avatar name={request.name} size="md" />
        <div className="min-w-0">
          <p className="font-medium">{request.name}</p>
          <p className="text-xs text-muted">
            Wants to join <span className="font-medium text-ink-2">{request.domainName}</span> · {timeAgo(request.createdAt)}
            {request.reviewedAt && ` · reviewed ${timeAgo(request.reviewedAt)}${request.reviewer ? ` by ${request.reviewer}` : ""}`}
          </p>
          {request.note && <p className="mt-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-sm text-ink-2">“{request.note}”</p>}
        </div>
      </div>
      {reviewable && (
        <div className="flex items-center gap-2 sm:shrink-0">
          <select className="input h-9 w-auto" value={domainId} onChange={(e) => setDomainId(e.target.value)} aria-label="Approve into domain">
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary h-9" onClick={() => review(false)} disabled={pending}>
            {pending && choice === false ? <Spinner size={14} /> : <X size={15} />} Reject
          </button>
          <button className="btn btn-primary h-9" onClick={() => review(true)} disabled={pending}>
            {pending && choice === true ? <Spinner size={14} /> : <Check size={15} />} Approve
          </button>
        </div>
      )}
    </li>
  );
}
