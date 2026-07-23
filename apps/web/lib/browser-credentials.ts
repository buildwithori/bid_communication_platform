type PasswordCredentialConstructor = new (data: {
  id: string;
  password: string;
  name?: string;
}) => Credential;

/**
 * Offers a successfully authenticated credential to the browser's password
 * manager. Browser support and the user's password-saving preference determine
 * whether a save prompt is shown.
 */
export async function offerBrowserCredentialSave(
  email: string,
  password: string,
) {
  if (
    typeof window === "undefined" ||
    !window.isSecureContext ||
    !email ||
    !password
  ) {
    return;
  }

  const PasswordCredential = (
    window as typeof window & {
      PasswordCredential?: PasswordCredentialConstructor;
    }
  ).PasswordCredential;

  if (!PasswordCredential || !navigator.credentials?.store) return;

  try {
    await navigator.credentials.store(
      new PasswordCredential({
        id: email,
        name: email,
        password,
      }),
    );
  } catch {
    // Credential saving is optional and may be denied by browser policy.
  }
}
