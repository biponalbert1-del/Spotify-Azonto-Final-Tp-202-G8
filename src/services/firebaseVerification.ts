type GoogleServicesConfig = {
  client?: Array<{
    api_key?: Array<{
      current_key?: string;
    }>;
  }>;
};

const googleServices = require('../../google-services.json') as GoogleServicesConfig;

const firebaseApiKey =
  googleServices.client?.[0]?.api_key?.[0]?.current_key ?? '';

type FirebaseAuthResponse = {
  idToken?: string;
  error?: {
    message?: string;
  };
};

async function firebaseAuthRequest(
  path: string,
  body: Record<string, unknown>,
): Promise<FirebaseAuthResponse> {
  if (!firebaseApiKey) {
    throw new Error('Configuration Google manquante.');
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/${path}?key=${firebaseApiKey}`,
    {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body),
    },
  );
  const data = (await response.json()) as FirebaseAuthResponse;

  if (!response.ok) {
    throw new Error(firebaseMessage(data.error?.message));
  }

  return data;
}

function firebaseMessage(message?: string) {
  if (message === 'OPERATION_NOT_ALLOWED') {
    return 'Email/Password est desactive dans Firebase Auth';
  }

  if (message === 'CONFIGURATION_NOT_FOUND') {
    return 'configuration Firebase Auth introuvable';
  }

  return message ?? 'Verification Google impossible';
}

export async function sendGoogleVerificationEmail(
  email: string,
  password: string,
) {
  let auth = await firebaseAuthRequest('accounts:signUp', {
    email,
    password,
    returnSecureToken: true,
  }).catch(async error => {
    if (
      error instanceof Error &&
      error.message.includes('EMAIL_EXISTS')
    ) {
      return firebaseAuthRequest('accounts:signInWithPassword', {
        email,
        password,
        returnSecureToken: true,
      });
    }

    throw error;
  });

  if (!auth.idToken) {
    throw new Error('Session Google introuvable.');
  }

  await firebaseAuthRequest('accounts:sendOobCode', {
    requestType: 'VERIFY_EMAIL',
    idToken: auth.idToken,
  });
}
