import type { Timestamp } from "firebase/firestore";

const pad = (value: number) => String(value).padStart(2, "0");

export const formatDateTimeLocal = (date: Date) => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

export const toLocalDateTimeInput = (timestamp?: Timestamp) => {
  return timestamp ? formatDateTimeLocal(timestamp.toDate()) : "";
};
