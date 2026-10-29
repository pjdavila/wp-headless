import { useMemo, useState } from "react";
import {
  applyView,
  formatPrice,
  parseFilters,
} from "../../lib/subscriptionAdminModel";
import styles from "../../styles/admin-subscriptions.module.css";

const TIME_ZONE = "America/Puerto_Rico";
const dateFormat = new Intl.DateTimeFormat("es-PR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});
const dateTimeFormat = new Intl.DateTimeFormat("es-PR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  timeZone: TIME_ZONE,
});

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateFormat.format(d);
}

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateTimeFormat.format(d);
}

const STATUS_OPTIONS = [
  ["all", "Todos los estados"],
  ["active", "Activo"],
  ["trialing", "En prueba"],
  ["problems", "Problemas de pago"],
  ["past_due", "Pago pendiente"],
  ["unpaid", "Impago"],
  ["cancelScheduled", "Cancelación programada"],
  ["canceled", "Cancelado"],
  ["incomplete", "Incompleta"],
  ["incomplete_expired", "Expirada"],
  ["paused", "Pausada"],
];

const TRIAL_OPTIONS = [
  ["all", "Con y sin prueba"],
  ["active", "En prueba ahora"],
  ["yes", "Tiene o tuvo prueba"],
  ["no", "Sin prueba"],
];

const SORT_OPTIONS = [
  ["start:desc", "Inicio: más recientes"],
  ["start:asc", "Inicio: más antiguas"],
  ["activeUntil:asc", "Activo hasta: más próximo"],
  ["activeUntil:desc", "Activo hasta: más lejano"],
  ["trialEnd:asc", "Fin de prueba: más próximo"],
];

const BADGE_CLASS = {
  active: "badgeActive",
  trialing: "badgeTrial",
  past_due: "badgeWarn",
  unpaid: "badgeDanger",
  canceled: "badgeMuted",
  incomplete: "badgeMuted",
  incomplete_expired: "badgeMuted",
  paused: "badgeMuted",
};

const UNTIL_HINT = {
  ended: "terminó",
  cancel_scheduled: "cancela",
  trial: "fin de prueba",
  period: "fin del período",
};

function SummaryCard({ label, value, hint, tone, active, onClick }) {
  return (
    <button
      type="button"
      className={`${styles.summaryCard} ${tone ? styles[tone] : ""} ${
        active ? styles.summaryActive : ""
      }`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className={styles.summaryValue}>{value}</span>
      <span className={styles.summaryLabel}>{label}</span>
      {hint && <span className={styles.summaryHint}>{hint}</span>}
    </button>
  );
}

export default function SubscriptionsPanel({
  data,
  refreshing,
  refreshError,
  onRefresh,
  onDownloadCsv,
}) {
  const [filters, setFilters] = useState(() => parseFilters({}));
  const [csvState, setCsvState] = useState({ busy: false, error: null });

  const rows = useMemo(
    () => applyView(data.rows, filters),
    [data.rows, filters],
  );
  const { summary } = data;

  const set = (patch) => setFilters((prev) => ({ ...prev, ...patch }));
  const setStatus = (status) =>
    set({ status: filters.status === status ? "all" : status });

  const exportCsv = async () => {
    setCsvState({ busy: true, error: null });
    try {
      await onDownloadCsv(filters);
      setCsvState({ busy: false, error: null });
    } catch (err) {
      setCsvState({ busy: false, error: err.message });
    }
  };

  const filtersActive =
    filters.q.trim() ||
    filters.status !== "all" ||
    filters.trial !== "all" ||
    filters.product !== "all";

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <p className={styles.fetchedAt}>
          Datos de Stripe al <strong>{formatDateTime(data.fetchedAt)}</strong>
          {data.cached && (
            <span className={styles.cachedNote}>
              {" "}
              (copia de hace menos de un minuto)
            </span>
          )}
        </p>
        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? "Actualizando…" : "Actualizar"}
        </button>
      </div>

      {refreshError && (
        <p className={styles.inlineError} role="alert">
          No se pudo actualizar: {refreshError} Se muestran los datos de la
          lectura anterior.
        </p>
      )}

      <div className={styles.summaryGrid}>
        <SummaryCard
          label="Suscripciones en total"
          value={summary.total}
          hint={`${summary.uniqueCustomers} ${
            summary.uniqueCustomers === 1 ? "cliente" : "clientes"
          }`}
          active={filters.status === "all"}
          onClick={() => set({ status: "all" })}
        />
        <SummaryCard
          label="Activas"
          value={summary.active}
          tone="toneActive"
          active={filters.status === "active"}
          onClick={() => setStatus("active")}
        />
        <SummaryCard
          label="En prueba"
          value={summary.trialing}
          tone="toneTrial"
          active={filters.status === "trialing"}
          onClick={() => setStatus("trialing")}
        />
        <SummaryCard
          label="Problemas de pago"
          value={summary.paymentProblems}
          hint="Pago pendiente o impago"
          tone="toneWarn"
          active={filters.status === "problems"}
          onClick={() => setStatus("problems")}
        />
        <SummaryCard
          label="Canceladas"
          value={summary.canceled}
          tone="toneMuted"
          active={filters.status === "canceled"}
          onClick={() => setStatus("canceled")}
        />
        <SummaryCard
          label="Cancelación programada"
          value={summary.cancelScheduled}
          hint="Cancela al final del período"
          tone="toneWarn"
          active={filters.status === "cancelScheduled"}
          onClick={() => setStatus("cancelScheduled")}
        />
      </div>

      <div className={styles.controls}>
        <label className={`${styles.control} ${styles.controlSearch}`}>
          <span className={styles.controlLabel}>Buscar</span>
          <input
            type="search"
            className={styles.input}
            placeholder="Nombre o email"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
          />
        </label>
        <label className={styles.control}>
          <span className={styles.controlLabel}>Estado</span>
          <select
            className={styles.input}
            value={filters.status}
            onChange={(e) => set({ status: e.target.value })}
          >
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.control}>
          <span className={styles.controlLabel}>Prueba</span>
          <select
            className={styles.input}
            value={filters.trial}
            onChange={(e) => set({ trial: e.target.value })}
          >
            {TRIAL_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.control}>
          <span className={styles.controlLabel}>Producto</span>
          <select
            className={styles.input}
            value={filters.product}
            onChange={(e) => set({ product: e.target.value })}
          >
            <option value="all">Todos los productos</option>
            {(data.products || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.control}>
          <span className={styles.controlLabel}>Ordenar</span>
          <select
            className={styles.input}
            value={`${filters.sort}:${filters.dir}`}
            onChange={(e) => {
              const [sort, dir] = e.target.value.split(":");
              set({ sort, dir });
            }}
          >
            {SORT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.resultsBar}>
        <p className={styles.resultsCount}>
          {rows.length === data.rows.length
            ? `${rows.length} ${rows.length === 1 ? "suscripción" : "suscripciones"}`
            : `${rows.length} de ${data.rows.length} suscripciones`}
          {filtersActive && (
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() =>
                set({ q: "", status: "all", trial: "all", product: "all" })
              }
            >
              Quitar filtros
            </button>
          )}
        </p>
        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={exportCsv}
          disabled={csvState.busy || rows.length === 0}
        >
          {csvState.busy ? "Preparando CSV…" : "Descargar CSV"}
        </button>
      </div>
      {csvState.error && (
        <p className={styles.inlineError} role="alert">
          No se pudo descargar el CSV: {csvState.error}
        </p>
      )}

      {data.rows.length === 0 ? (
        <div className={styles.emptyCard}>
          <h2 className={styles.stateTitle}>Todavía no hay suscriptores</h2>
          <p className={styles.stateText}>
            Stripe respondió correctamente y no tiene ninguna suscripción
            registrada.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className={styles.emptyCard}>
          <p className={styles.stateText}>
            Ninguna suscripción coincide con estos filtros.
          </p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Suscriptor</th>
                <th scope="col">Envío</th>
                <th scope="col">Plan</th>
                <th scope="col">Estado</th>
                <th scope="col">Activo hasta</th>
                <th scope="col">Prueba</th>
                <th scope="col">Inicio</th>
                <th scope="col">Stripe</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <SubscriptionRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SubscriptionRow({ row }) {
  const address = [row.addressLine1, row.addressLine2]
    .filter(Boolean)
    .join(", ");
  const townZip = [row.town, row.zip].filter(Boolean).join(" ");
  const price = formatPrice(row);

  return (
    <tr>
      <td data-label="Suscriptor">
        <div className={styles.cellMain}>{row.name || "Sin nombre"}</div>
        {row.email && (
          <a className={styles.cellSub} href={`mailto:${row.email}`}>
            {row.email}
          </a>
        )}
        {row.phone && <div className={styles.cellSub}>{row.phone}</div>}
      </td>
      <td data-label="Envío">
        {townZip || address ? (
          <>
            {townZip && <div className={styles.cellMain}>{townZip}</div>}
            {address && <div className={styles.cellSub}>{address}</div>}
          </>
        ) : (
          <span className={styles.cellSub}>—</span>
        )}
      </td>
      <td data-label="Plan">
        <div className={styles.cellMain}>{row.productName || "—"}</div>
        {price && <div className={styles.cellSub}>{price}</div>}
      </td>
      <td data-label="Estado">
        <div className={styles.badges}>
          <span
            className={`${styles.badge} ${
              styles[BADGE_CLASS[row.status] || "badgeMuted"]
            }`}
            title={`Estado en Stripe: ${row.status}`}
          >
            {row.statusLabel}
          </span>
          {row.cancelScheduled && (
            <span className={`${styles.badge} ${styles.badgeOutlineWarn}`}>
              Cancela al final del período
            </span>
          )}
        </div>
        <div className={styles.cellSub}>
          {row.active ? "Activo" : "No activo"}
        </div>
      </td>
      <td data-label="Activo hasta">
        <div className={styles.cellMain}>{formatDate(row.activeUntil)}</div>
        {row.activeUntil && UNTIL_HINT[row.activeUntilReason] && (
          <div className={styles.cellSub}>
            {UNTIL_HINT[row.activeUntilReason]}
          </div>
        )}
      </td>
      <td data-label="Prueba">
        {row.hadTrial ? (
          <>
            <span
              className={`${styles.badge} ${
                row.inTrial ? styles.badgeTrial : styles.badgeOutline
              }`}
            >
              {row.inTrial ? "En prueba" : "Tuvo prueba"}
            </span>
            <div className={styles.cellSub}>
              {row.inTrial ? "Termina" : "Terminó"} {formatDate(row.trialEnd)}
            </div>
          </>
        ) : (
          <span className={styles.cellSub}>No</span>
        )}
      </td>
      <td data-label="Inicio">
        <div className={styles.cellMain}>{formatDate(row.startDate)}</div>
      </td>
      <td data-label="Stripe">
        <div className={styles.links}>
          <a
            href={row.stripeSubscriptionUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Suscripción
          </a>
          {row.stripeCustomerUrl && (
            <a
              href={row.stripeCustomerUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Cliente
            </a>
          )}
        </div>
      </td>
    </tr>
  );
}
