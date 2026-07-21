import { redirect } from "next/navigation";

export default function HomePage() {
  // Instantly redirect anyone who visits the main link straight to the dashboard
  redirect("/dashboard");
}