export async function callApi({
  endpoint,
  type,
  method = "GET",
  body,
  query = {},
  authKey,
  onUnauthorized,
}) {
  const url = new URL(endpoint, window.location.origin);
  url.searchParams.set("type", type);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const res = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-auth-key": authKey || "",
    },
    body: method === "GET" ? null : JSON.stringify({ ...body, type }),
  });

  if (res.status === 401) {
    if (onUnauthorized) onUnauthorized();
    return null;
  }

  try {
    return await res.json();
  } catch (error) {
    return null;
  }
}
