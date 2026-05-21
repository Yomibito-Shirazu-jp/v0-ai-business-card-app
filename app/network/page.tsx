import { redirect } from "next/navigation"

export default function NetworkRedirectPage() {
  redirect("/?view=analytics&tab=network")
}
