"use client";

import { signIn } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function InviteClient() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [info, setInfo] = useState<{
    workspaceName: string;
    role: string;
    email: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    void fetch(`/api/invites/${token}`)
      .then(async (res) => {
        const data = (await res.json()) as {
          workspaceName?: string;
          role?: string;
          email?: string | null;
          error?: string;
        };
        if (!res.ok) {
          setError(data.error ?? "Invalid invite");
          return;
        }
        setInfo({
          workspaceName: data.workspaceName ?? "",
          role: data.role ?? "MEMBER",
          email: data.email ?? null,
        });
      })
      .catch(() => setError("Could not load invite"))
      .finally(() => setLoading(false));
  }, [token]);

  async function onAccept() {
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (res.status === 401) {
        void signIn(undefined, { callbackUrl: `/invite/${token}` });
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Could not accept");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Could not accept");
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading invite…</p>;
  }

  if (error && !info) {
    return <p className="text-sm text-amber-200">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Workspace invite</h1>
        {info ? (
          <p className="mt-2 text-sm text-zinc-400">
            You’ve been invited to <strong>{info.workspaceName}</strong> as{" "}
            <strong>{info.role}</strong>.
            {info.email ? (
              <>
                {" "}
                This invite is for <strong>{info.email}</strong>.
              </>
            ) : null}
          </p>
        ) : null}
      </div>
      {error ? <p className="text-sm text-amber-200">{error}</p> : null}
      <button
        type="button"
        disabled={accepting}
        onClick={onAccept}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {accepting ? "Joining…" : "Accept & open dashboard"}
      </button>
    </div>
  );
}
