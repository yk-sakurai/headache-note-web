import type { HeadacheAction, HeadacheLog, HeadacheMedication } from "@/lib/firestore/types";

export type SerializableHeadacheMedication = Omit<HeadacheMedication, "takenAt"> & {
  takenAt: string;
};

export type SerializableHeadacheAction = Omit<HeadacheAction, "takenAt"> & {
  takenAt: string;
};

export type SerializableHeadacheLog = Omit<HeadacheLog, "timing" | "medications" | "actions"> & {
  timing: string;
  medications?: SerializableHeadacheMedication[];
  actions?: SerializableHeadacheAction[];
};
