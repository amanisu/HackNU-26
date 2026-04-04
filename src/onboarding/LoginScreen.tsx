/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAuthContext } from "@/auth/AuthProvider";
import { Button, Link } from "@radix-ui/themes";
import { ArrowRightIcon } from "lucide-react";
import { Onboarding } from "./Onboarding";

export function LoginScreen() {
  const { signIn } = useAuthContext();
  return (
    <Onboarding.Container>
      <Onboarding.Logo />
      <Onboarding.Title>Product Canvas</Onboarding.Title>
      <Onboarding.Description>
        An experiment in collaboratively brainstorming apps with AI.{" "}
        <Link
          target="_blank"
          href="https://labs.google/code/experiments/product-canvas"
        >
          Learn more
        </Link>
      </Onboarding.Description>
      <Button onClick={() => signIn()}>
        Sign in with Google
        <ArrowRightIcon size={16} />
      </Button>
      <Onboarding.LabsCodeLink />
    </Onboarding.Container>
  );
}
