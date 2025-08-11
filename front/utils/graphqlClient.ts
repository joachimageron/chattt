// Simple GraphQL fetch client (pas d'Apollo pour rester simple)
// Utilise les cookies (credentials: 'include') pour transmettre le JWT httpOnly

export interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/graphql";

export async function gqlFetch<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error("Network error " + res.status);
  }

  const json: GraphQLResponse<T> = await res.json();
  if (json.errors && json.errors.length) {
    throw new Error(json.errors.map((e) => e.message).join("\n"));
  }
  if (!json.data) {
    throw new Error("No data returned");
  }
  return json.data;
}

// Requêtes / mutations GraphQL réutilisables
export const AUTH_QUERIES = {
  ME: `query Me { me { user { id email name } } }`,
  LOGIN: `mutation Login($loginInput: LoginInput!) { login(loginInput: $loginInput) { user { id email name } } }`,
  REGISTER: `mutation Register($createUserInput: CreateUserInput!) { createUser(createUserInput: $createUserInput) { id email name } }`,
  LOGOUT: `mutation Logout { logout { success } }`,
};
