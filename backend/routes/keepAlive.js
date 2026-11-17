const EVO_URL = process.env.EVO_URL;
const EVO_KEY = process.env.EVO_KEY;

export async function keepAlive() {
  const res = await fetch(`${EVO_URL}/instance/fetchInstances`, {
    headers: { apikey: EVO_KEY },
  });
  await res.json();
  console.log("Keep-alive OK");
}
