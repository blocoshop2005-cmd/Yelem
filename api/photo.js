// Fonction serveur Vercel : retire le fond d'une photo de produit.
// Réservée aux vendeurs connectés. La clé du service d'image reste secrète ici.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });

  const key = process.env.REMOVE_BG_API_KEY;
  if (!key) return res.status(503).json({ error: "no_key" });

  // 1. Vérifier que la personne est un vendeur connecté (jeton Supabase).
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "login" });
  const who = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: process.env.SUPABASE_ANON_KEY },
  });
  if (!who.ok) return res.status(401).json({ error: "login" });

  // 2. Contrôler la photo reçue.
  const { image } = req.body || {};
  if (typeof image !== "string" || image.length > 3_000_000) {
    return res.status(400).json({ error: "bad_image" });
  }
  const b64 = image.replace(/^data:image\/\w+;base64,/, "");

  // 3. Envoyer au service de détourage.
  const form = new FormData();
  form.append("image_file_b64", b64);
  form.append("size", "regular");
  form.append("format", "png");
  const r = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": key },
    body: form,
  });
  if (!r.ok) return res.status(502).json({ error: "provider", status: r.status });

  const png = Buffer.from(await r.arrayBuffer()).toString("base64");
  return res.status(200).json({ image: `data:image/png;base64,${png}` });
}
