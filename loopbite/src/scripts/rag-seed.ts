// Loads or refreshes the starter safety library. Documents admins added are untouched.
import { seedLibrary } from "@/lib/rag/library";

seedLibrary()
  .then((n) => { console.log(`Safety library: loaded ${n} starter documents.`); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
