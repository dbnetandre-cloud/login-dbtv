(function () {
  "use strict";

  var TIPOS = {
    nome:  { titulo: "Nome do cliente", dica: "Digite o nome do cliente", modo: "text" },
    id:    { titulo: "ID do cliente",   dica: "Digite o ID do cliente",   modo: "numeric" },
    login: { titulo: "Login",           dica: "Digite o login",           modo: "text" }
  };

  var $ = function (id) { return document.getElementById(id); };
  var telas = { tipo: $("tela-tipo"), busca: $("tela-busca"), resultado: $("tela-resultado") };
  var ordem = ["tipo", "busca", "resultado"];
  var atual = "tipo";
  var tipo = null;
  var toastTimer;

  function ir(nome) {
    atual = nome;
    ordem.forEach(function (k) { telas[k].hidden = k !== nome; });
    $("voltar").hidden = nome === "tipo";
    $("passo").textContent = "Passo " + (ordem.indexOf(nome) + 1) + " de 3";
    window.scrollTo(0, 0);
  }

  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 1500);
  }

  function copiar(texto) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = texto;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(texto).catch(fallback);
    } else {
      fallback();
    }
    toast("Copiado!");
  }

  function mostrarErro(msg) {
    var e = $("erro");
    e.textContent = msg || "";
    e.hidden = !msg;
  }

  // ---- Passo 1 ----
  Array.prototype.forEach.call(document.querySelectorAll(".opcao"), function (b) {
    b.addEventListener("click", function () {
      tipo = b.getAttribute("data-tipo");
      var t = TIPOS[tipo];
      $("titulo-busca").textContent = t.titulo;
      var input = $("valor");
      input.value = "";
      input.placeholder = t.dica;
      input.setAttribute("inputmode", t.modo);
      mostrarErro("");
      ir("busca");
      input.focus();
    });
  });

  // ---- Passo 2 ----
  $("form-busca").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var valor = $("valor").value.trim();
    if (!valor) return;
    buscar(valor);
  });

  function buscar(valor) {
    var btn = $("buscar");
    btn.disabled = true;
    btn.textContent = "Buscando...";
    mostrarErro("");

    var headers = { "Content-Type": "application/json" };
    if (window.CONFIG.TOKEN) headers["X-Token"] = window.CONFIG.TOKEN;

    var ctrl = new AbortController();
    var timeout = setTimeout(function () { ctrl.abort(); }, 20000);

    fetch(window.CONFIG.WEBHOOK_URL, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ tipo: tipo, valor: valor }),
      signal: ctrl.signal
    })
      .then(function (r) {
        if (!r.ok) throw new Error("http " + r.status);
        return r.json();
      })
      .then(function (data) {
        var lista = Array.isArray(data) ? data : (data.resultados || []);
        if (!lista.length) {
          mostrarErro("Nenhum cliente encontrado.");
          return;
        }
        renderizar(lista);
        ir("resultado");
      })
      .catch(function (e) {
        mostrarErro(e.name === "AbortError"
          ? "Tempo esgotado. Tente novamente."
          : "Erro ao consultar. Verifique a conexão e tente de novo.");
      })
      .then(function () {
        clearTimeout(timeout);
        btn.disabled = false;
        btn.textContent = "Buscar";
      });
  }

  // ---- Passo 3 ----
  function campo(rotulo, valor, mascarar) {
    var div = document.createElement("div");
    div.className = "campo";
    var label = document.createElement("label");
    label.textContent = rotulo;
    var linha = document.createElement("div");
    linha.className = "linha";
    var v = document.createElement("div");
    v.className = "valor";
    var visivel = !mascarar;
    var render = function () { v.textContent = visivel ? valor : "••••••••"; };
    render();
    linha.appendChild(v);

    if (mascarar) {
      var olho = document.createElement("button");
      olho.type = "button";
      olho.textContent = "Ver";
      olho.addEventListener("click", function () {
        visivel = !visivel;
        olho.textContent = visivel ? "Ocultar" : "Ver";
        render();
      });
      linha.appendChild(olho);
    }
    var cp = document.createElement("button");
    cp.type = "button";
    cp.textContent = "Copiar";
    cp.addEventListener("click", function () { copiar(valor); });
    linha.appendChild(cp);

    div.appendChild(label);
    div.appendChild(linha);
    return div;
  }

  function renderizar(lista) {
    var box = $("resultados");
    box.textContent = "";
    lista.forEach(function (c) {
      var card = document.createElement("div");
      card.className = "cliente";
      var h = document.createElement("h3");
      h.textContent = c.nome || "Cliente";
      card.appendChild(h);
      if (c.id != null) {
        var m = document.createElement("div");
        m.className = "meta";
        m.textContent = "ID " + c.id;
        card.appendChild(m);
      }
      card.appendChild(campo("Login", String(c.login || ""), false));
      card.appendChild(campo("Senha", String(c.senha || ""), true));
      box.appendChild(card);
    });
  }

  $("nova").addEventListener("click", function () {
    $("resultados").textContent = "";
    ir("tipo");
  });

  $("voltar").addEventListener("click", function () {
    if (atual === "resultado") {
      $("resultados").textContent = "";
      ir("busca");
    } else {
      ir("tipo");
    }
  });

  ir("tipo");
})();
