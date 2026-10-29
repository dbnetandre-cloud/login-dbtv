// Configuração do app. Troque pela URL do webhook (Production URL) do n8n.
window.CONFIG = {
  WEBHOOK_URL: "https://SEU-N8N.exemplo.com/webhook/login-dbtv",
  // Token simples enviado no header "X-Token" (valide no n8n). Deixe "" para não enviar.
  TOKEN: ""
};
