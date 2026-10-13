# Priscila Modas

Site da loja servido por um servidor Node.js, pronto para execução local ou publicação em uma hospedagem que aceite aplicações Node.

## Estrutura do projeto

```text
server.js                 Servidor e rotas HTTP
.vscode/launch.json       Atalho de depuração do servidor no VS Code (F5)
public/
  index.html              Página e conteúdo da loja
  css/styles.css          Identidade visual e layout responsivo
  js/navigation.js        Menu e elementos gerais da página
  js/cart.js              Carrinho e finalização pelo WhatsApp
  assets/                 Logo e fotos dos produtos
package.json              Comandos e configuração do projeto
```

Os arquivos do site que o navegador acessa ficam em `public/`. O servidor na raiz entrega somente arquivos explicitamente permitidos em `server.js`.

## Requisitos

- Node.js 20 ou superior

## Executar localmente

```bash
npm start
```

Abra `http://localhost:3000`. Para conferir se o servidor está respondendo, acesse `http://localhost:3000/api/health`.

No PowerShell do Windows, use `npm.cmd start` caso a política de execução bloqueie o comando `npm`. Durante o desenvolvimento, `npm run dev` (ou `npm.cmd run dev` no PowerShell) reinicia o servidor quando os arquivos do servidor são alterados.

## Publicar e usar um domínio

1. Publique os arquivos deste projeto em uma hospedagem que ofereça suporte a Node.js.
2. Configure o comando de inicialização como `npm start`. A hospedagem deve fornecer a variável `PORT`, que o servidor utiliza automaticamente.
3. Adicione seu domínio personalizado no painel da hospedagem e configure no provedor do domínio os registros DNS indicados por ela.
4. Aguarde a propagação do DNS e habilite HTTPS pelo painel da hospedagem.

O servidor escuta em `0.0.0.0` para aceitar conexões da plataforma. A configuração de DNS e o endereço/IP de destino dependem da hospedagem escolhida; não é possível conectar o domínio antes de ter acesso a esse painel.

As imagens de moda e as fontes tipográficas são carregadas de serviços externos, então precisam de conexão com a internet.

As fotos da aba Produtos ficam em `public/assets/produtos`.

## Carrinho de compras

O carrinho permite selecionar tamanho, adicionar produtos, alterar quantidades e remover itens. A primeira composição exige a seleção separada do tamanho único da bata e do número do short (36, 38, 40, 42 ou 44). As demais peças usam tamanho único conforme as medidas informadas. A seleção é salva no navegador do cliente. Os preços ainda serão confirmados pela loja; o checkout envia o resumo do pedido e solicita o valor pelo WhatsApp. O site não processa pagamentos nem confirma estoque.

## Verificações rápidas

```bash
npm run check
```

Esse comando verifica a sintaxe do servidor e dos scripts de navegação e carrinho.

No VS Code, pressione **F5** e escolha `Priscila Modas: depurar servidor` para iniciar o servidor pelo depurador.
