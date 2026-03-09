"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { updateOrganisation, completeOnboarding } from "@/lib/actions/onboarding";
import { createClientRecord } from "@/lib/actions/clients";
import { createCase } from "@/lib/actions/cases";
import { Briefcase, Users, Building2, CheckCircle, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);

  const [orgForm, setOrgForm] = useState({ name: "", address: "", phone: "" });
  const [clientForm, setClientForm] = useState({ name: "", contact_person: "", email: "" });
  const [caseForm, setCaseForm] = useState({ title: "", priority: "MEDIUM" });
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);

  const next = () => setStep((s) => Math.min(s + 1, 5));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const handleOrgSave = () => {
    startTransition(async () => {
      try {
        if (orgForm.name) await updateOrganisation(orgForm);
        next();
      } catch (err) {
        toast("error", (err as Error).message);
      }
    });
  };

  const handleClientSave = () => {
    startTransition(async () => {
      try {
        if (clientForm.name) {
          const c = await createClientRecord(clientForm);
          setCreatedClientId(c.id);
          toast("success", "Client created");
        }
        next();
      } catch (err) {
        toast("error", (err as Error).message);
      }
    });
  };

  const handleCaseSave = () => {
    startTransition(async () => {
      try {
        if (caseForm.title) {
          await createCase({
            title: caseForm.title,
            priority: caseForm.priority,
            client_id: createdClientId ?? undefined,
          });
          toast("success", "Case created");
        }
        next();
      } catch (err) {
        toast("error", (err as Error).message);
      }
    });
  };

  const handleComplete = () => {
    startTransition(async () => {
      try {
        await completeOnboarding();
        router.push("/");
        router.refresh();
      } catch (err) {
        toast("error", (err as Error).message);
      }
    });
  };

  const steps = [
    { num: 1, label: "Welcome" },
    { num: 2, label: "Organisation" },
    { num: 3, label: "Client" },
    { num: 4, label: "Case" },
    { num: 5, label: "Done" },
  ];

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Progress */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= s.num ? "bg-accent text-bg" : "bg-surface-light text-text-muted"
            }`}>
              {step > s.num ? <CheckCircle className="h-4 w-4" /> : s.num}
            </div>
            {s.num < 5 && <div className={`w-8 h-0.5 ${step > s.num ? "bg-accent" : "bg-surface-light"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Welcome */}
      {step === 1 && (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-bg text-2xl font-bold">
            iG
          </div>
          <h1 className="text-3xl font-bold text-text mb-2">Welcome to InvestiGator</h1>
          <p className="text-text-muted mb-2 max-w-md mx-auto">
            The professional investigation case management platform. Let&apos;s set up your workspace in a few quick steps.
          </p>
          <div className="grid grid-cols-3 gap-4 my-8 text-center">
            <div className="rounded-xl border border-border bg-surface p-4">
              <Briefcase className="h-6 w-6 text-accent mx-auto mb-2" />
              <p className="text-xs text-text-muted">Case Management</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <Sparkles className="h-6 w-6 text-accent mx-auto mb-2" />
              <p className="text-xs text-text-muted">AI Reports</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <Users className="h-6 w-6 text-accent mx-auto mb-2" />
              <p className="text-xs text-text-muted">Client Portal</p>
            </div>
          </div>
          <Button onClick={next} size="lg">
            Get Started <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Step 2: Organisation */}
      {step === 2 && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="h-6 w-6 text-accent" />
            <div>
              <h2 className="text-lg font-semibold text-text">Your Organisation</h2>
              <p className="text-sm text-text-muted">Tell us about your agency</p>
            </div>
          </div>
          <div className="space-y-4">
            <Input id="org_name" label="Agency Name" placeholder="Smith Investigations Ltd" value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} />
            <Input id="org_address" label="Address" placeholder="123 High Street, London" value={orgForm.address} onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })} />
            <Input id="org_phone" label="Phone" placeholder="+44 20 1234 5678" value={orgForm.phone} onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-6">
            <Button variant="secondary" onClick={prev}><ArrowLeft className="h-4 w-4" /> Back</Button>
            <div className="flex-1" />
            <Button onClick={handleOrgSave} loading={isPending}>Next <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Step 3: First Client */}
      {step === 3 && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center gap-3 mb-6">
            <Users className="h-6 w-6 text-accent" />
            <div>
              <h2 className="text-lg font-semibold text-text">Add Your First Client</h2>
              <p className="text-sm text-text-muted">You can skip this and add clients later</p>
            </div>
          </div>
          <div className="space-y-4">
            <Input id="client_name" label="Client Name" placeholder="Acme Insurance" value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} />
            <Input id="client_contact" label="Contact Person" placeholder="Jane Smith" value={clientForm.contact_person} onChange={(e) => setClientForm({ ...clientForm, contact_person: e.target.value })} />
            <Input id="client_email" label="Email" type="email" placeholder="jane@acme.com" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-6">
            <Button variant="secondary" onClick={prev}><ArrowLeft className="h-4 w-4" /> Back</Button>
            <div className="flex-1" />
            <Button variant="ghost" onClick={next}>Skip</Button>
            <Button onClick={handleClientSave} loading={isPending}>Create & Next <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Step 4: First Case */}
      {step === 4 && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center gap-3 mb-6">
            <Briefcase className="h-6 w-6 text-accent" />
            <div>
              <h2 className="text-lg font-semibold text-text">Create Your First Case</h2>
              <p className="text-sm text-text-muted">You can skip this and create cases later</p>
            </div>
          </div>
          <div className="space-y-4">
            <Input id="case_title" label="Case Title" placeholder="Insurance fraud investigation" value={caseForm.title} onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-6">
            <Button variant="secondary" onClick={prev}><ArrowLeft className="h-4 w-4" /> Back</Button>
            <div className="flex-1" />
            <Button variant="ghost" onClick={next}>Skip</Button>
            <Button onClick={handleCaseSave} loading={isPending}>Create & Finish <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Step 5: Complete */}
      {step === 5 && (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/20">
            <CheckCircle className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-text mb-2">You&apos;re all set!</h1>
          <p className="text-text-muted mb-8 max-w-md mx-auto">
            Your workspace is ready. Start managing your investigations.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button onClick={handleComplete} loading={isPending} size="lg">
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
