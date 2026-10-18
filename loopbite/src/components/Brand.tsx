import Link from "next/link";
import { Letters } from "./Letters";
import { Logo } from "./Logo";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="LoopBite home">
      <Logo />
      <Letters text="LoopBite" />
    </Link>
  );
}
