import { redirect } from "next/navigation";

// The old Mac-desktop landing page was retired. Its parts now live as native
// apps inside the iOS-4 phone. Everyone enters through the phone at /fish-v2.
export default function RootRedirect() {
  redirect("/fish-v2");
}
