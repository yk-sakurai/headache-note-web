import { redirect } from "next/navigation";
import { WEB_WITHDRAWAL_ENABLED } from "@/lib/constants";
import AccountDeleteForm from "./AccountDeleteForm";

export default function AccountDeletePage() {
  if (!WEB_WITHDRAWAL_ENABLED) redirect("/account");
  return <AccountDeleteForm />;
}
