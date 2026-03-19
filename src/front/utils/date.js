export const formatDate = (value) => {
  if (!value) return "";

  const raw = String(value).trim();

  if (/^\d{4}$/.test(raw)) {
    return `01/01/${raw}`;
  }

  if (/^\d{4}-\d{2}$/.test(raw)) {
    const [year, month] = raw.split("-");
    return `01/${month}/${year}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-");
    return `${day}/${month}/${year}`;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};