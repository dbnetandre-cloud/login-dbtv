(function () {
  "use strict";

  var TIPOS = {
    nome:  { titulo: "Nome do cliente", dica: "Digite o nome do cliente", modo: "text" },
    id:    { titulo: "ID do cliente",   dica: "Digite o ID do cliente",   modo: "numeric" },
    login: { titulo: "Login",           dica: "Digite o login",           modo: "text" }
  };

  var $ = function (id) { return document.getElementById(id); };
  var telas = {
    tipo: $("tela-tipo"), busca: $("tela-busca"),
    lista: $("tela-lista"), resultado: $("tela-resultado")
  };
  var atual = "tipo";
  var tipo = null;
  var viaLista = false; // resultado veio da lista de nomes
  var toastTimer;

  function ir(nome) {
    atual = nome;
    Object.keys(telas).forEach(function (k) { telas[k].hidden = k !== nome; });
    $("voltar").hidden = nome === "tipo";
    var total = tipo === "nome" ? 4 : 3;
    var pos = { tipo: 1, busca: 2, lista: 3, resultado: total }[nome];
    $("passo").textContent = pos + "/" + total;
    $("barra").style.width = (pos / total * 100) + "%";
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

  // O fluxo do n8n devolve [{ resultado: [...] }]; aceita também { resultados: [...] } ou lista direta.
  function normalizar(data) {
    if (Array.isArray(data)) {
      var out = [];
      data.forEach(function (d) {
        if (d && Array.isArray(d.resultado)) out = out.concat(d.resultado);
        else if (d && Array.isArray(d.resultados)) out = out.concat(d.resultados);
        else if (d) out.push(d);
      });
      return out;
    }
    return (data && (data.resultado || data.resultados)) || [];
  }

  function consultar(tipoReq, valor) {
    var headers = { "Content-Type": "application/json" };
    if (window.CONFIG.TOKEN) headers["X-Token"] = window.CONFIG.TOKEN;

    var ctrl = new AbortController();
    var timeout = setTimeout(function () { ctrl.abort(); }, 20000);

    return fetch(window.CONFIG.WEBHOOK_URL, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ tipo: tipoReq, valor: valor }),
      signal: ctrl.signal
    })
      .then(function (r) {
        clearTimeout(timeout);
        if (!r.ok) throw new Error("http " + r.status);
        return r.json();
      })
      .then(normalizar)
      .catch(function (e) {
        clearTimeout(timeout);
        throw e;
      });
  }

  function msgErro(e) {
    return e.name === "AbortError"
      ? "Tempo esgotado. Tente novamente."
      : "Erro ao consultar. Verifique a conexão e tente de novo.";
  }

  function buscar(valor) {
    var btn = $("buscar");
    btn.disabled = true;
    btn.textContent = "Buscando...";
    mostrarErro("");

    consultar(tipo, valor)
      .then(function (lista) {
        if (!lista.length) {
          mostrarErro("Nenhum cliente encontrado.");
          return;
        }
        if (tipo === "nome") {
          viaLista = true;
          renderizarLista(lista);
          ir("lista");
        } else {
          viaLista = false;
          renderizar(lista);
          ir("resultado");
        }
      })
      .catch(function (e) { mostrarErro(msgErro(e)); })
      .then(function () {
        btn.disabled = false;
        btn.textContent = "Buscar";
      });
  }

  // ---- Lista (busca por nome) ----
  function renderizarLista(lista) {
    $("qtd").textContent = lista.length + (lista.length === 1 ? " cliente encontrado" : " clientes encontrados");
    var box = $("lista");
    box.textContent = "";
    lista.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "item";

      var topo = document.createElement("span");
      topo.className = "topo-item";

      var nome = document.createElement("strong");
      nome.textContent = c.nome || "Cliente";

      var dir = document.createElement("span");
      dir.className = "dir";
      var id = document.createElement("span");
      id.className = "id";
      id.textContent = "ID " + c.cliente_id;
      var selo = document.createElement("span");
      selo.className = "selo" + (c.ativo === "S" ? "" : " off");
      selo.textContent = c.ativo === "S" ? "Ativo" : "Inativo";
      dir.appendChild(id);
      dir.appendChild(selo);

      topo.appendChild(nome);
      topo.appendChild(dir);
      b.appendChild(topo);

      var end = (c.enderecos && c.enderecos[0]) || {};
      var linhas = [];
      var rua = [end.rua, end.numero].filter(Boolean).join(", ");
      if (rua) linhas.push(["end", rua]);
      var comp = [end.bairro, end.bloco && "Bloco " + end.bloco, end.apartamento && "Ap " + end.apartamento]
        .filter(Boolean).join(" · ");
      if (comp) linhas.push(["end", comp]);
      if (c.cpf) linhas.push(["cpf", "CPF " + c.cpf]);

      linhas.forEach(function (l) {
        var s = document.createElement("span");
        s.className = "linha-info " + l[0];
        s.textContent = l[1];
        b.appendChild(s);
      });

      b.addEventListener("click", function () { selecionar(c, b); });
      box.appendChild(b);
    });
  }

  function selecionar(c, btn) {
    var botoes = document.querySelectorAll("#lista .item");
    Array.prototype.forEach.call(botoes, function (x) { x.disabled = true; });
    btn.style.opacity = ".6";

    consultar("id", String(c.cliente_id))
      .then(function (lista) {
        if (!lista.length) { toast("Sem login para este cliente"); return; }
        renderizar(lista);
        ir("resultado");
      })
      .catch(function (e) { toast(msgErro(e)); })
      .then(function () {
        Array.prototype.forEach.call(botoes, function (x) { x.disabled = false; });
        btn.style.opacity = "";
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
      card.appendChild(campo("Senha", String(c.senha || ""), false));
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
      ir(viaLista ? "lista" : "busca");
    } else if (atual === "lista") {
      ir("busca");
    } else {
      ir("tipo");
    }
  });

  ir("tipo");
})();
