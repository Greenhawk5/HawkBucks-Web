import * as React from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Layers,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
} from "lucide-react";
import {
  DEFAULT_FEATURE_AVAILABILITY,
  DEFAULT_FEATURE_MESSAGES,
  FEATURE_KEYS,
  FEATURE_METADATA,
  MAX_MESSAGE_LENGTH,
  computeBulkState,
  type FeatureAvailabilityConfig,
  type FeatureKey,
} from "@/lib/cms/feature-availability";
import { updateFeatureAvailabilityAdmin } from "@/lib/cms/feature-availability.loader";
import {
  CmsCard,
  CmsNotice,
  CmsSectionTitle,
  CmsStatusBadge,
} from "@/components/cms/cc/CmsPrimitives";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export interface FeatureAvailabilityManagerProps {
  initialConfig: FeatureAvailabilityConfig;
  initialUpdatedAt: string;
  canManage: boolean;
}

export function FeatureAvailabilityManager({
  initialConfig,
  initialUpdatedAt,
  canManage,
}: FeatureAvailabilityManagerProps) {
  const [config, setConfig] = React.useState<FeatureAvailabilityConfig>(() =>
    structuredClone(initialConfig || DEFAULT_FEATURE_AVAILABILITY),
  );
  const [savedConfig, setSavedConfig] = React.useState<FeatureAvailabilityConfig>(() =>
    structuredClone(initialConfig || DEFAULT_FEATURE_AVAILABILITY),
  );
  const [updatedAt, setUpdatedAt] = React.useState(initialUpdatedAt);
  const [isSaving, setIsSaving] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Check if current form differs from last persisted state
  const hasChanges = React.useMemo(() => {
    return JSON.stringify(config) !== JSON.stringify(savedConfig);
  }, [config, savedConfig]);

  const bulkState = React.useMemo(() => computeBulkState(config), [config]);

  const handleToggle = (key: FeatureKey, nextEnabled: boolean) => {
    if (!canManage || isSaving) return;
    setStatusMessage(null);
    setConfig((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled: nextEnabled,
      },
    }));
  };

  const handleMessageChange = (key: FeatureKey, nextMessage: string) => {
    if (!canManage || isSaving) return;
    setStatusMessage(null);
    setConfig((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        message: nextMessage.slice(0, MAX_MESSAGE_LENGTH),
      },
    }));
  };

  const handleResetMessage = (key: FeatureKey) => {
    if (!canManage || isSaving) return;
    setStatusMessage(null);
    setConfig((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        message: DEFAULT_FEATURE_MESSAGES[key],
      },
    }));
  };

  const handleBulkToggle = (enableAll: boolean) => {
    if (!canManage || isSaving) return;
    setStatusMessage(null);
    setConfig((prev) => {
      const next = { ...prev };
      for (const k of FEATURE_KEYS) {
        next[k] = {
          ...next[k],
          enabled: enableAll,
        };
      }
      return next;
    });
  };

  const handleDiscard = () => {
    setConfig(structuredClone(savedConfig));
    setStatusMessage(null);
  };

  const handleSave = async () => {
    if (!canManage || isSaving || !hasChanges) return;
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const result = await updateFeatureAvailabilityAdmin({
        data: {
          config,
          ...(updatedAt ? { expectedUpdatedAt: updatedAt } : {}),
        },
      });

      if (result.success) {
        setSavedConfig(structuredClone(result.config));
        setConfig(structuredClone(result.config));
        setUpdatedAt(result.updatedAt);
        setStatusMessage({
          type: "success",
          text: "Section availability settings successfully persisted and activated in real time.",
        });
      } else {
        setStatusMessage({
          type: "error",
          text: "Failed to persist availability settings.",
        });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred while saving.";
      setStatusMessage({
        type: "error",
        text: message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section aria-label="Section availability and database read protection" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <CmsSectionTitle>Public Section Availability & Database Protection</CmsSectionTitle>
          <p className="mt-1 text-sm opacity-70">
            Control the availability of public sections to reduce unnecessary database reads and
            conserve quota. When disabled, normal content loading and all protected database queries
            are completely paused.
          </p>
        </div>

        {/* Bulk status pill */}
        <div className="flex items-center gap-2">
          {bulkState === "all_enabled" && (
            <CmsStatusBadge tone="ok">All 4 sections online</CmsStatusBadge>
          )}
          {bulkState === "all_disabled" && (
            <CmsStatusBadge tone="danger">All 4 sections paused</CmsStatusBadge>
          )}
          {bulkState === "mixed" && (
            <CmsStatusBadge tone="warning">Mixed availability (indeterminate)</CmsStatusBadge>
          )}
        </div>
      </div>

      {!canManage && (
        <CmsNotice kind="info">
          You are viewing these settings with a read-only role. Only administrators (role: admin)
          can toggle section availability or customize maintenance messages.
        </CmsNotice>
      )}

      {statusMessage && (
        <div
          role="alert"
          className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${
            statusMessage.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/20 bg-red-500/10 text-red-400"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <div className="flex-1 leading-relaxed">{statusMessage.text}</div>
        </div>
      )}

      {/* Bulk actions banner */}
      <CmsCard title="Bulk Controls">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Quick bulk operation</p>
            <p className="text-xs opacity-70">
              Atomically enable or disable all four public-facing sections at once.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canManage || isSaving}
              onClick={() => handleBulkToggle(true)}
              className="gap-1.5"
            >
              <PlayCircle className="h-4 w-4 text-emerald-500" />
              Enable All Sections
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canManage || isSaving}
              onClick={() => handleBulkToggle(false)}
              className="gap-1.5"
            >
              <PauseCircle className="h-4 w-4 text-rose-500" />
              Disable All Sections
            </Button>
          </div>
        </div>
      </CmsCard>

      {/* Individual section cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {FEATURE_KEYS.map((key) => {
          const setting = config[key];
          const meta = FEATURE_METADATA[key];
          const isEnabled = setting.enabled;

          return (
            <div
              key={key}
              className={`rounded-xl border p-5 transition-colors ${
                isEnabled
                  ? "border-border/60 bg-card/40"
                  : "border-amber-500/30 bg-amber-500/5 shadow-sm ring-1 ring-amber-500/10"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-semibold text-foreground">
                      {meta.label}
                    </h3>
                    <code className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                      {meta.route}
                    </code>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>
                </div>

                <div className="flex items-center gap-2.5">
                  <span
                    className={`font-mono text-xs font-semibold uppercase ${
                      isEnabled ? "text-emerald-500" : "text-amber-500"
                    }`}
                  >
                    {isEnabled ? "Online" : "Paused"}
                  </span>
                  <Switch
                    id={`toggle-${key}`}
                    checked={isEnabled}
                    disabled={!canManage || isSaving}
                    onCheckedChange={(checked) => handleToggle(key, checked)}
                    aria-label={`Toggle ${meta.label} section availability`}
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t cc-hairline space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label
                    htmlFor={`message-${key}`}
                    className="font-medium text-foreground/80 opacity-80"
                  >
                    Unavailable display message
                  </label>
                  <span className="font-mono text-muted-foreground">
                    {setting.message.length}/{MAX_MESSAGE_LENGTH}
                  </span>
                </div>

                <Textarea
                  id={`message-${key}`}
                  value={setting.message}
                  disabled={!canManage || isSaving}
                  onChange={(e) => handleMessageChange(key, e.target.value)}
                  placeholder={DEFAULT_FEATURE_MESSAGES[key]}
                  className="min-h-[72px] text-xs leading-relaxed resize-y"
                  aria-label={`Maintenance message for ${meta.label}`}
                />

                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    disabled={
                      !canManage || isSaving || setting.message === DEFAULT_FEATURE_MESSAGES[key]
                    }
                    onClick={() => handleResetMessage(key)}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Reset to default message
                  </Button>

                  <span className="text-[11px] text-muted-foreground/70">
                    {isEnabled
                      ? "Message will display when section is paused."
                      : "Currently displayed to public visitors."}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Persistence Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/20 p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0" />
          <span>
            {updatedAt ? `Last saved: ${updatedAt}` : "Using default configuration (uninitialized)"}
          </span>
          {hasChanges && (
            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-500 ring-1 ring-amber-500/20">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={handleDiscard}
            >
              Discard Edits
            </Button>
          )}

          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={!canManage || !hasChanges || isSaving}
            onClick={handleSave}
            className="gap-1.5"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
