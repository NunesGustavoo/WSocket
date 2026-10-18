<h1 align='center'><img alt="WSocket logo" src="https://raw.githubusercontent.com/WhiskeySockets/Baileys/refs/heads/master/Media/logo.png" height="75"/></h1>

<div align='center'>

# WSocket — WhatsApp Web WebSocket Library

**WSocket** é um fork corporativo de alto desempenho do **Baileys**, projetado para conexões WebSocket diretas com o WhatsApp Web sem a necessidade de navegador, Puppeteer ou Selenium.

</div>

---

## 📌 Sumário

1. [Visão Geral & Diferenciais do Fork](#-visão-geral--diferenciais-do-fork)
2. [Instalação](#-instalação)
3. [Inicialização Rápida](#-inicialização-rápida)
4. [Autenticação e Sessões](#-autenticação-e-sessões)
   - [Conexão com QR Code](#conexão-com-qr-code)
   - [Conexão com Pairing Code (Sem QR)](#conexão-com-pairing-code-sem-qr)
   - [Armazenamento de Sessão em Arquivos](#armazenamento-em-arquivos-usemultifileauthstate)
   - [Armazenamento em Banco de Dados (SQL/NoSQL)](#armazenamento-em-banco-de-dados-sql-ou-nosql)
   - [Cache de Chaves Criptográficas](#cache-de-chaves-criptográficas-makecacheablesignalkeystore)
5. [Gerenciamento de Eventos (Event Bus)](#-gerenciamento-de-eventos-event-bus)
   - [Tratamento em Lote (`ev.process`)](#tratamento-em-lote-recomendado)
   - [Principais Eventos do Ciclo de Vida](#principais-eventos)
6. [Identificadores (JIDs), LID e Prevenção de Erros](#-identificadores-jids-lid-e-prevenção-de-erros)
   - [Formatos de JID](#formatos-de-jid)
   - [Suporte Robusto a LID vs PN](#suporte-a-lid-e-pn)
   - [Prevenção do Erro 463 (TC-Token e NCT Salt)](#prevenção-do-erro-463-tc-tokens)
7. [Envio de Mensagens Comuns](#-envio-de-mensagens-comuns)
   - [Texto, Citações e Menções](#texto-citações-e-menções)
   - [Links com Pré-visualização (Link Preview)](#links-com-pré-visualização)
   - [Mídias (Imagens, Vídeos, Áudios/PTT, Stickers, Documentos)](#mídias)
   - [Mensagens de Visualização Única (View Once)](#visualização-única-view-once)
   - [Mensagens Autodestrutivas Pós-Leitura (`afterReadDuration`)](#mensagens-autodestrutivas-pós-leitura-afterreadduration)
   - [Mensagens com Spoiler (`isSpoiler`)](#mensagens-com-spoiler-isspoiler)
   - [Contatos (vCard), Localização e Encaminhamentos](#contatos-localização-e-encaminhamentos)
   - [Reações e Fixação de Mensagens (Pin)](#reações-e-fixação-de-mensagens)
   - [Enquetes e Decodificação de Votos](#enquetes-e-decodificação-de-votos)
   - [Solicitar e Compartilhar Telefone](#solicitar-e-compartilhar-telefone)
   - [Edição e Exclusão de Mensagens](#edição-e-exclusão-de-mensagens)
   - [Download e Re-upload de Mídias](#download-e-re-upload-de-mídias)
8. [Mensagens Interativas & Native Flow](#-mensagens-interativas--native-flow)
   - [Botão de Pagamento PIX Nativo](#botão-de-pagamento-pix-nativo)
   - [Respostas Rápidas (`quickReplyButtons`)](#respostas-rápidas-quickreplybuttons)
   - [Botões Native Flow Personalizados](#botões-native-flow-personalizados)
   - [Carrossel Interativo](#carrossel-interativo)
   - [Listas Interativas (`ListMessage`)](#listas-interativas-listmessage)
9. [Status (Stories) e Status de Grupo](#-status-stories-e-status-de-grupo)
   - [Publicação de Status Geral (`sendStatus`)](#publicação-de-status-geral-sendstatus)
   - [Status de Grupo (`groupStatusMessageV2`)](#status-de-grupo-groupstatusmessagev2)
10. [Canais / Newsletters](#-canais--newsletters)
    - [Criação, Edição e Exclusão](#criação-edição-e-exclusão-de-canais)
    - [Consulta de Metadados e Convites](#consulta-de-metadados-e-convites)
    - [Postagens em Canais (Texto, Mídia, Enquetes, Perguntas)](#postagens-em-canais)
    - [Gestão de Administradores](#gestão-de-administradores)
    - [Interação com Posts e Atualizações ao Vivo](#interação-e-atualizações-ao-vivo)
11. [Gerenciamento de Grupos](#-gerenciamento-de-grupos)
    - [Criação e Administração Básica](#criação-e-administração-básica)
    - [Participantes e Fila de Aprovação](#participantes-e-fila-de-aprovação)
    - [Links de Convite](#links-de-convite)
    - [Configurações e Modos de Entrada](#configurações-e-modos-de-entrada)
12. [WhatsApp Business & Catálogo](#-whatsapp-business--catálogo)
    - [Consulta de Perfil Comercial e Catálogo](#consulta-de-perfil-e-catálogo)
    - [Gestão de Produtos (CRUD)](#gestão-de-produtos-crud)
13. [Presença, Chats e Privacidade](#-presença-chats-e-privacidade)
    - [Presença e Digitação](#presença-e-digitação)
    - [Leitura de Mensagens](#leitura-de-mensagens)
    - [Modificação de Chats (`chatModify`)](#modificação-de-chats-chatmodify)
    - [Rejeição de Chamadas](#rejeição-de-chamadas)
    - [Privacidade da Conta e Bloqueios](#privacidade-da-conta-e-bloqueios)
14. [Resend de Mensagens Placeholder & Sync Sob Demanda](#-resend-de-mensagens-placeholder--sync-sob-demanda)
15. [Arquitetura Interna & Otimizações de Performance](#-arquitetura-interna--otimizações-de-performance)

---

## 🚀 Visão Geral & Diferenciais do Fork

Enquanto o Baileys original e a documentação pública em `baileys.wiki` atendem a casos básicos, o **WSocket** resolve gargalos reais de produção com centenas de conexões simultâneas e adiciona recursos modernos do protocolo do WhatsApp:

* **Gerenciamento Completo de Canais (Newsletters):** Criação, edição, exclusão, postagem de mídias/enquetes/perguntas, convite e demissão de administradores, busca paginada de histórico e reações.
* **Status Nativo & Status de Grupo:** API simplificada `sendStatus()` com audiência seletiva e suporte a `groupStatusMessageV2` direcionado a grupos `@g.us`.
* **Mensagens Interativas Native Flow:** Botão de pagamento **PIX nativo** compatível com iOS e Android, respostas rápidas, carrosséis e empacotamento seguro de listas interativas contra rejeição de clientes modernos.
* **Proteção Criptográfica & Anti-Inchaço:** Resolução do bug de vazamento de até 2.000 chaves puladas de *Sender Key* em grupos, mutex isolado por chat/autor, verificação Ed25519 nativa via `crypto.verify` (de ~6 ms para ~0,1 ms) e transações seguras no SignalKeyStore.
* **Robustez de Identidade (LID + PN):** Suporte completo à nova arquitetura de identificação do WhatsApp com mapeamento automático de JID para LID e emissão/renovação de TC-Tokens (elimina o erro 463).
* **Mensagens Temporárias Personalizadas:** `afterReadDuration` para destruição automática N segundos após a leitura sem alterar o tempo padrão do chat.
* **Placeholder Resend (PDO) & History Sync:** Recuperação automática sob demanda de mensagens com placeholder pendente no aparelho principal.

---

## 📦 Instalação

Requer **Node.js ≥ 20**.

```bash
# Via repositório Git
yarn add github:<usuario>/WSocket

# Ou via npm (quando publicado)
yarn add @whiskeysockets/baileys
```

Dependências opcionais recomendadas para suporte a thumbnails de mídia e pré-visualização de links:
```bash
yarn add jimp link-preview-js
```

---

## ⚡ Inicialização Rápida

```typescript
import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'

async function connectToWhatsApp() {
    // Carrega ou inicializa as credenciais na pasta local 'auth_info'
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')

    // Consulta a versão mais recente suportada do WhatsApp Web
    const { version, isLatest } = await fetchLatestBaileysVersion()
    console.log(`Conectando com WhatsApp Web v${version.join('.')} (Última versão: ${isLatest})`)

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true, // Imprime o QR Code no terminal
        markOnlineOnConnect: false // Não força online na conexão
    })

    // Escuta atualizações de conexão
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('Conexão encerrada. Reconectando?', shouldReconnect)
            if (shouldReconnect) {
                connectToWhatsApp()
            }
        } else if (connection === 'open') {
            console.log('Conexão estabelecida com sucesso!')
        }
    })

    // Salva as credenciais sempre que forem atualizadas
    sock.ev.on('creds.update', saveCreds)

    // Processa mensagens recebidas
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return

        for (const msg of messages) {
            if (!msg.key.fromMe && msg.message?.conversation) {
                const jid = msg.key.remoteJid!
                const texto = msg.message.conversation

                if (texto === '!ping') {
                    await sock.sendMessage(jid, { text: 'pong! 🏓' }, { quoted: msg })
                }
            }
        }
    })
}

connectToWhatsApp()
```

---

## 🔐 Autenticação e Sessões

### Conexão com QR Code
Por padrão, `printQRInTerminal: true` desenha o QR Code diretamente no terminal. Se preferir receber a string do QR Code para exibir em uma interface web:

```typescript
const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
})

sock.ev.on('connection.update', ({ qr }) => {
    if (qr) {
        // Exiba a string qr como imagem ou envie para seu frontend
        console.log('String do QR Code:', qr)
    }
})
```

### Conexão com Pairing Code (Sem QR)
Permite conectar informando apenas o número de telefone (com DDI e DDD, sem caracteres especiais como `+` ou `-`):

```typescript
const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
})

if (!sock.authState.creds.registered) {
    const numeroTelefone = '5511999999999' // Somente números
    const codigoPareamento = await sock.requestPairingCode(numeroTelefone)
    console.log(`Código de pareamento (8 dígitos): ${codigoPareamento}`)
    // Insira este código no WhatsApp do celular em: Aparelhos conectados > Conectar com número de telefone
}
```

### Armazenamento em Arquivos (`useMultiFileAuthState`)
Ideal para testes ou servidores com disco persistente:
```typescript
import { useMultiFileAuthState } from '@whiskeysockets/baileys'

const { state, saveCreds } = await useMultiFileAuthState('./caminho_sessao')
const sock = makeWASocket({ auth: state })
sock.ev.on('creds.update', saveCreds)
```

### Armazenamento em Banco de Dados (SQL ou NoSQL)
Para produção em larga escala (PostgreSQL, MySQL, Redis, MongoDB), estruture um `AuthenticationState` personalizado contendo:
* `creds`: Um objeto `AuthenticationCreds` serializado com `BufferJSON.replacer`.
* `keys`: Uma implementação de `SignalKeyStore` com os métodos `get`, `set` e `clear`.

Exemplo conceitual de estrutura de chaves:
```typescript
import { AuthenticationState, BufferJSON, proto } from '@whiskeysockets/baileys'

async function loadDbAuthState(sessionId: string): Promise<AuthenticationState> {
    const credsRaw = await db.get(`creds:${sessionId}`)
    const creds = credsRaw ? JSON.parse(credsRaw, BufferJSON.reviver) : initAuthCreds()

    return {
        creds,
        keys: {
            get: async (type, ids) => {
                const data: Record<string, any> = {}
                for (const id of ids) {
                    const row = await db.get(`keys:${sessionId}:${type}:${id}`)
                    if (row) data[id] = JSON.parse(row, BufferJSON.reviver)
                }
                return data
            },
            set: async (data) => {
                for (const type in data) {
                    for (const id in data[type]) {
                        const val = data[type][id]
                        if (val) {
                            await db.set(`keys:${sessionId}:${type}:${id}`, JSON.stringify(val, BufferJSON.replacer))
                        } else {
                            await db.del(`keys:${sessionId}:${type}:${id}`)
                        }
                    }
                }
            }
        }
    }
}
```

### Cache de Chaves Criptográficas (`makeCacheableSignalKeyStore`)
Evita centenas de consultas repetidas ao banco de dados ou disco durante o envio e recebimento de mensagens:
```typescript
import { makeCacheableSignalKeyStore } from '@whiskeysockets/baileys'

const sock = makeWASocket({
    auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
    }
})
```

---

## 📡 Gerenciamento de Eventos (Event Bus)

### Tratamento em Lote (Recomendado)
Para alto rendimento e prevenção de travamentos do event loop, utilize `sock.ev.process` em vez de múltiplos ouvintes isolados:

```typescript
sock.ev.process(async (events) => {
    // Alterações na conexão
    if (events['connection.update']) {
        const update = events['connection.update']
        // Tratar status, reconexão, QR code...
    }

    // Credenciais atualizadas (Signal sessions, prekeys)
    if (events['creds.update']) {
        await saveCreds()
    }

    // Novas mensagens recebidas
    if (events['messages.upsert']) {
        const { messages, type } = events['messages.upsert']
        if (type === 'notify') {
            for (const msg of messages) {
                // Processar mensagem ao vivo
            }
        }
    }

    // Mensagens atualizadas (Confirmações de leitura, votos em enquetes)
    if (events['messages.update']) {
        for (const { key, update } of events['messages.update']) {
            if (update.pollUpdates) {
                // Voto em enquete atualizado
            }
        }
    }

    // Participantes de grupos (Entrou, saiu, promovido, rebaixado)
    if (events['group-participants.update']) {
        const { id, participants, action } = events['group-participants.update']
        console.log(`Grupo ${id}: ${action} para`, participants)
    }

    // Chamadas de voz/vídeo recebidas
    if (events.call) {
        for (const call of events.call) {
            if (call.status === 'offer') {
                await sock.rejectCall(call.id, call.from)
            }
        }
    }
})
```

### Principais Eventos
| Evento | Descrição |
| --- | --- |
| `connection.update` | Status da conexão (`open`, `connecting`, `close`), QR Code e motivo da desconexão. |
| `creds.update` | Atualização das credenciais e chaves criptográficas (deve ser persistido obrigatoriamente). |
| `messages.upsert` | Recebimento de mensagens (novas mensagens `type: "notify"` ou histórico `type: "append"`). |
| `messages.update` | Atualização de status de entrega/leitura e votos em enquetes. |
| `message-receipt.update` | Recibos de entrega e leitura detalhados. |
| `messages.reaction` | Reações com emojis adicionadas ou removidas. |
| `groups.update` | Alteração de metadados de grupo (título, descrição, configurações). |
| `group-participants.update` | Alteração de membros do grupo (`add`, `remove`, `promote`, `demote`). |
| `presence.update` | Atualização de presença de contatos (`composing`, `recording`, `available`, `unavailable`). |
| `messaging-history.set` | Sincronização inicial ou sob demanda de histórico de chats e mensagens. |
| `call` | Oferta, atendimento ou término de chamadas de voz e vídeo. |

---

## 🆔 Identificadores (JIDs), LID e Prevenção de Erros

### Formatos de JID
* **Usuário Normal (PN):** `[DDI][DDD][Número]@s.whatsapp.net` (Ex.: `5511999999999@s.whatsapp.net`).
* **Identidade Vinculada (LID):** `[identificador]@lid`.
* **Grupos:** `[timestamp]-[id]@g.us` ou `[número]@g.us`.
* **Canais (Newsletters):** `[identificador]@newsletter`.
* **Status / Stories:** `status@broadcast`.

Utilitários de normalização em `@whiskeysockets/baileys`:
```typescript
import {
    jidNormalizedUser,
    isJidGroup,
    isJidUser,
    isLidUser,
    isJidNewsletter,
    areJidsSameUser
} from '@whiskeysockets/baileys'

const jidLimpo = jidNormalizedUser(rawJid)
const ehGrupo = isJidGroup(jid)
const ehCanal = isJidNewsletter(jid)
```

### Suporte a LID e PN
O WhatsApp utiliza cada vez mais o endereçamento via **LID** (`@lid`) para proteger os números de telefone em grupos e canais.
O **WSocket** resolve automaticamente a correspondência entre o número de telefone (PN) e o LID dos participantes, preenchendo as chaves com `sender_lid`, `sender_pn`, `participant_lid` e `participant_pn`, evitando falhas de sessão onde mensagens citadas ou reações ficavam com autor desconhecido.

### Prevenção do Erro 463 (TC-Tokens)
Quando uma conta envia mensagens privadas para contatos que não a possuem na agenda, o WhatsApp exige um **TC-Token** (*Trusted Contact Token*) assinado com o salt NCT.
O WSocket gerencia e renova esses tokens em background (`src/Socket/tc-token.ts`), eliminando as falhas silenciosas de entrega e rejeições do servidor com código de erro 463 e 479.

---

## ✉️ Envio de Mensagens Comuns

O método central de envio é `sock.sendMessage(jid, content, options)`.

### Texto, Citações e Menções

```typescript
// Texto simples
await sock.sendMessage(jid, { text: 'Olá mundo!' })

// Respondendo / Citando uma mensagem recebida (Quote)
await sock.sendMessage(jid, { text: 'Resposta direta' }, { quoted: mensagemRecebida })

// Menções explícitas de usuários
await sock.sendMessage(jid, {
    text: 'Atenção @5511999999999 e @5511888888888!',
    mentions: ['5511999999999@s.whatsapp.net', '5511888888888@s.whatsapp.net']
})
```

### Links com Pré-visualização
Instale a dependência `link-preview-js`:
```typescript
await sock.sendMessage(jid, {
    text: 'Acesse nosso site: https://exemplo.com'
})
```

### Mídias
Você pode fornecer mídia via `Buffer`, caminho local (`{ url: './foto.png' }`) ou `Readable Stream`.

```typescript
import fs from 'fs'

// Imagem
await sock.sendMessage(jid, {
    image: { url: './imagem.jpg' },
    caption: 'Legenda da foto'
})

// Vídeo ou GIF
await sock.sendMessage(jid, {
    video: fs.readFileSync('./video.mp4'),
    caption: 'Confira este vídeo!',
    gifPlayback: false // Se true, reproduz em loop como GIF
})

// Nota de vídeo circular (PTV / Video Note)
await sock.sendMessage(jid, {
    video: { url: './video.mp4' },
    ptv: true
})

// Áudio / Mensagem de Voz (PTT)
// Dica: Para notas de voz com ondas sonoras gravadas, utilize codec libopus/ogg
await sock.sendMessage(jid, {
    audio: { url: './audio.ogg' },
    mimetype: 'audio/ogg; codecs=opus',
    ptt: true // true = nota de voz gravada no microfone
})

// Documento genérico (PDF, ZIP, etc.)
await sock.sendMessage(jid, {
    document: { url: './relatorio.pdf' },
    mimetype: 'application/pdf',
    fileName: 'Relatorio-Financeiro.pdf',
    caption: 'Segue o relatório em anexo.'
})

// Figurinha (Sticker estático ou animado)
await sock.sendMessage(jid, {
    sticker: { url: './figurinha.webp' }
})
```

### Visualização Única (View Once)
Funciona com imagens, vídeos e áudios:
```typescript
await sock.sendMessage(jid, {
    image: { url: './segredo.jpg' },
    caption: 'Foto de visualização única!',
    viewOnce: true
})
```

### Mensagens Autodestrutivas Pós-Leitura (`afterReadDuration`)
Recurso exclusivo do WSocket: permite definir um tempo em segundos para a mensagem sumir automaticamente **após o destinatário abrir/ler**, sem alterar as mensagens temporárias do grupo ou chat:

```typescript
await sock.sendMessage(jid, {
    text: 'Esta mensagem será destruída 30 segundos após você ler!',
    contextInfo: {
        expiration: 0,
        ephemeralSettingTimestamp: Date.now(),
        disappearingMode: { initiator: 0, trigger: 1 },
        afterReadDuration: 30 // Segundos após a leitura
    }
})
```

### Mensagens com Spoiler (`isSpoiler`)
Oculta o conteúdo com tarja de spoiler no WhatsApp:
```typescript
await sock.sendMessage(jid, {
    text: 'O assassino do filme é ||o mordomo||!',
    contextInfo: {
        isSpoiler: true
    }
})
```

### Contatos, Localização e Encaminhamentos

```typescript
// Contato (vCard)
const vcard =
    'BEGIN:VCARD\n' +
    'VERSION:3.0\n' +
    'FN:Contato de Exemplo\n' +
    'ORG:Minha Empresa;\n' +
    'TEL;type=CELL;type=VOICE;waid=5511999999999:+55 11 99999-9999\n' +
    'END:VCARD'

await sock.sendMessage(jid, {
    contacts: {
        displayName: 'Contato de Exemplo',
        contacts: [{ vcard }]
    }
})

// Localização
await sock.sendMessage(jid, {
    location: {
        degreesLatitude: -23.55052,
        degreesLongitude: -46.633308,
        name: 'São Paulo'
    }
})

// Encaminhamento de mensagem existente
await sock.sendMessage(jid, { forward: mensagemOriginal })
```

### Reações e Fixação de Mensagens

```typescript
// Reagir a uma mensagem (envie string vazia '' para remover a reação)
await sock.sendMessage(jid, {
    react: {
        text: '🔥',
        key: mensagemRecebida.key
    }
})

// Fixar mensagem no chat (Pin)
// Duração: 86400 (24h), 604800 (7 dias), 2592000 (30 dias)
await sock.sendMessage(jid, {
    pin: {
        key: mensagemRecebida.key,
        type: 1, // 1 = Fixar, 0 = Desafixar
        time: 86400
    }
})
```

### Enquetes e Decodificação de Votos

```typescript
// Criando uma enquete
await sock.sendMessage(jid, {
    poll: {
        name: 'Qual seu jogo favorito?',
        values: ['Minecraft', 'GTA V', 'Counter-Strike 2'],
        selectableCount: 1 // 1 para escolha única, 0 ou mais para múltipla
    }
})

// Processando votos recebidos (messages.update)
import { getAggregateVotesInPollMessage } from '@whiskeysockets/baileys'

sock.ev.on('messages.update', async (updates) => {
    for (const { key, update } of updates) {
        if (update.pollUpdates) {
            // Recupere a mensagem original de criação da enquete do seu banco/store
            const pollCreationMessage = await getMessageFromStore(key)
            if (pollCreationMessage) {
                const votosAgregados = getAggregateVotesInPollMessage({
                    message: pollCreationMessage,
                    pollUpdates: update.pollUpdates
                })
                console.log('Resultado da votação:', votosAgregados)
            }
        }
    }
})
```

### Solicitar e Compartilhar Telefone
```typescript
// Solicita o número de telefone do contato (útil em conversas via LID)
await sock.sendMessage(jid, { requestPhoneNumber: true })

// Compartilha o próprio número de telefone
await sock.sendMessage(jid, { sharePhoneNumber: true })
```

### Edição e Exclusão de Mensagens

```typescript
// Edição de mensagem de texto enviada por você
await sock.sendMessage(jid, {
    text: 'Texto corrigido com sucesso!',
    edit: mensagemEnviada.key
})

// Excluir para todos (Revoke)
await sock.sendMessage(jid, { delete: mensagemEnviada.key })
```

### Download e Re-upload de Mídias

```typescript
import { downloadMediaMessage, getContentType } from '@whiskeysockets/baileys'
import fs from 'fs'

// Baixando uma mídia recebida
const buffer = await downloadMediaMessage(
    mensagemRecebida,
    'buffer',
    {},
    {
        logger,
        reuploadRequest: sock.updateMediaMessage // Reenvia solicitação se a mídia expirou
    }
)
fs.writeFileSync('./arquivo_baixado.jpg', buffer)

// Re-upload de mídia caso tenha sido apagada dos servidores do WhatsApp
await sock.updateMediaMessage(mensagemRecebida)
```

---

## 🎛️ Mensagens Interativas & Native Flow

O WSocket constrói automaticamente os nós `<biz>` e `<native_flow>` corretos, evitando que o WhatsApp Web e o Android descartem mensagens interativas ou exibam erro de versão incompatível.

### Botão de Pagamento PIX Nativo
Gera um card oficial de cobrança PIX com botão para copiar a chave diretamente no aplicativo:

```typescript
import { generatePixButton } from '@whiskeysockets/baileys'

const botaoPix = generatePixButton({
    key: '12345678900', // Chave PIX (CPF, CNPJ, Telefone, E-mail ou EVP)
    keyType: 'cpf', // 'cpf' | 'cnpj' | 'phone' | 'email' | 'random'
    merchantName: 'Loja Exemplo',
    referenceId: 'PEDIDO-9872'
})

await sock.sendMessage(jid, {
    text: 'Sua fatura foi gerada! Clique abaixo para pagar:',
    title: 'Cobrança do Pedido',
    footer: 'Pagamento instantâneo via PIX',
    interactiveButtons: [botaoPix]
})
```

### Respostas Rápidas (`quickReplyButtons`)
Botões de texto simples para o usuário tocar e responder de imediato:

```typescript
await sock.sendMessage(jid, {
    text: 'Você deseja continuar com o atendimento?',
    title: 'Atendimento Virtual',
    footer: 'Selecione uma opção',
    quickReplyButtons: [
        { displayText: '✅ Sim, continuar', id: 'btn_sim' },
        { displayText: '❌ Não, finalizar', id: 'btn_nao' }
    ]
})
```

### Botões Native Flow Personalizados
Criação direta de botões de link, cópia ou ações nativas:

```typescript
await sock.sendMessage(jid, {
    text: 'Acesse nossos canais e ferramentas:',
    interactiveButtons: [
        {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
                display_text: '🌐 Acessar Site',
                url: 'https://exemplo.com',
                merchant_url: 'https://exemplo.com'
            })
        },
        {
            name: 'cta_copy',
            buttonParamsJson: JSON.stringify({
                display_text: '📋 Copiar Cupom',
                copy_code: 'DESCONTO10'
            })
        }
    ]
})
```

### Carrossel Interativo
O WSocket injeta o nó `<biz>` correto com `v="9" name="mixed"`, impedindo que o carrossel seja recusado com código 473:

```typescript
await sock.sendMessage(jid, {
    text: 'Confira os produtos em destaque:',
    interactiveButtons: [], // Os cards vivem dentro de carouselMessage
    // Veja a documentação interna de tipos para montagem avançada de cards
})
```

### Listas Interativas (`ListMessage`)
O WSocket envelopa listas automaticamente em `documentWithCaptionMessage` para garantir renderização perfeita no WhatsApp Web e iOS:

```typescript
await sock.sendMessage(jid, {
    text: 'Escolha um item do nosso menu:',
    title: 'Cardápio Principal',
    buttonText: 'Ver Opções',
    sections: [
        {
            title: 'Bebidas',
            rows: [
                { title: 'Refrigerante', rowId: 'bebida_refri', description: 'Lata 350ml' },
                { title: 'Suco Natural', rowId: 'bebida_suco', description: 'Copo 500ml' }
            ]
        },
        {
            title: 'Lanches',
            rows: [
                { title: 'Hambúrguer Artesanal', rowId: 'lanche_burger', description: 'Com queijo e bacon' }
            ]
        }
    ]
})
```

---

## 📢 Status (Stories) e Status de Grupo

### Publicação de Status Geral (`sendStatus`)
Método de alto nível do socket que valida a lista de destinatários autorizados a visualizar o status:

```typescript
// Publicando texto no status
await sock.sendStatus(
    { text: 'Bom dia a todos! ☀️' },
    {
        statusJidList: ['5511999999999@s.whatsapp.net', '5511888888888@s.whatsapp.net'],
        backgroundColor: '#10b981', // Cor de fundo hex
        font: 3 // Estilo de fonte
    }
)

// Publicando foto ou vídeo no status
await sock.sendStatus(
    {
        image: { url: './promocao.jpg' },
        caption: 'Promoção do dia!'
    },
    {
        statusJidList: ['5511999999999@s.whatsapp.net']
    }
)
```

### Status de Grupo (`groupStatusMessageV2`)
Permite publicar status voltados exclusivamente para um grupo específico:
```typescript
await sock.sendMessage(
    '123456789-987654@g.us',
    {
        text: '📢 Comunicado importante para o grupo!'
    },
    // O WSocket anexa <meta is_group_status="true" origin="group_status">
)
```

---

## 📰 Canais / Newsletters

O WSocket implementa uma camada completa de gestão e postagem em canais do WhatsApp através do socket `newsletter.ts`.

### Criação, Edição e Exclusão de Canais

```typescript
// Criar um novo canal
const canal = await sock.newsletterCreate({
    name: 'Meu Canal Oficial',
    description: 'Novidades e atualizações em tempo real',
    picture: fs.readFileSync('./logo_canal.jpg') // Imagem JPEG 640x640 recomendada
})
console.log('Canal criado! JID:', canal.id) // Ex: 120363000000000000@newsletter

// Atualizar nome, descrição ou foto
await sock.newsletterUpdate(canal.id, {
    name: 'Meu Canal Oficial - 2026',
    description: 'Nova descrição do canal',
    picture: null // Passar null remove a foto atual do canal
})

// Apagar o canal definitivamente
await sock.newsletterDelete(canal.id)
```

### Consulta de Metadados e Convites

```typescript
// Buscar detalhes por JID
const metadata = await sock.newsletterMetadata('120363000000000000@newsletter')
console.log(`Nome: ${metadata.name}, Inscritos: ${metadata.subscribersCount}`)

// Buscar detalhes através de um código de convite (link do canal)
// Exemplo: para https://whatsapp.com/channel/0029VaXXXXXX use '0029VaXXXXXX'
const canalInfo = await sock.newsletterMetadataByInvite('0029VaXXXXXX')

// Listar todos os canais que você segue ou administra
const meusCanais = await sock.newsletterList()
```

### Postagens em Canais
Como canais transmitem mensagens públicas sem criptografia ponta a ponta (E2EE), o WSocket utiliza stanzas `<plaintext>` e uploads diretos otimizados:

```typescript
const canalJid = '120363000000000000@newsletter'

// Texto
const postTexto = await sock.newsletterSendText(canalJid, 'Mensagem publicada no canal!')

// Imagem
await sock.newsletterSendImage(canalJid, fs.readFileSync('./imagem.jpg'), {
    caption: 'Foto do evento'
})

// Vídeo ou GIF
await sock.newsletterSendVideo(canalJid, fs.readFileSync('./video.mp4'), {
    caption: 'Vídeo demonstrativo',
    gifPlayback: false
})

// Áudio / Nota de voz
await sock.newsletterSendAudio(canalJid, fs.readFileSync('./audio.ogg'), {
    ptt: true
})

// Figurinha (Sticker WebP)
await sock.newsletterSendSticker(canalJid, fs.readFileSync('./sticker.webp'))

// Enquete no Canal
await sock.newsletterSendPoll(canalJid, {
    name: 'Qual o melhor tema?',
    values: ['Escuro', 'Claro', 'Automático'],
    selectableCount: 1 // 1 = Escolha única, 0 = Múltipla escolha
})

// Pergunta para seguidores (Interactive Question)
await sock.newsletterSendText(canalJid, 'O que você achou da última atualização?', {
    question: true // Os seguidores podem responder diretamente
})
```

### Gestão de Administradores

```typescript
// Convidar administrador enviando o card por DM para o telefone dele
// userLid: Deve ser obrigatório no formato <id>@lid
// dm.to: Número de telefone (@s.whatsapp.net) que receberá o card do convite
await sock.newsletterAdminInvite(canalJid, '123456789@lid', {
    to: '5511999999999@s.whatsapp.net',
    caption: 'Você foi convidado para ser administrador do nosso canal!'
})

// Revogar convite de administrador
await sock.newsletterAdminInviteRevoke(canalJid, '123456789@lid')

// Rebaixar administrador para membro comum
await sock.newsletterAdminDemote(canalJid, '123456789@lid')

// Obter contagem de administradores do canal
const totalAdmins = await sock.newsletterAdminCount(canalJid)

// Transferir a propriedade do canal para outro administrador
await sock.newsletterChangeOwner(canalJid, 'novo_dono@lid')
```

### Interação e Atualizações ao Vivo

```typescript
// Reagir a um post do canal com emoji (serverId é o ID numérico do post no servidor)
await sock.newsletterReactMessage(canalJid, '123', '👍')

// Remover reação de um post
await sock.newsletterReactMessage(canalJid, '123', '')

// Buscar histórico de mensagens paginado
const { messages, hasNextPage, nextBefore } = await sock.newsletterFetchMessages(canalJid, {
    count: 50,
    before: null // Informe o serverId do último post para avançar páginas
})

// Buscar respostas de uma pergunta publicada no canal
const { responses } = await sock.newsletterQuestionResponses(canalJid, '123', {
    count: 20
})

// Seguir e Deixar de Seguir
await sock.newsletterFollow(canalJid)
await sock.newsletterUnfollow(canalJid)

// Silenciar e Reativar notificações
await sock.newsletterMute(canalJid)
await sock.newsletterUnmute(canalJid)

// Assinar atualizações em tempo real do canal
const liveSub = await sock.subscribeNewsletterUpdates(canalJid)
```

---

## 👥 Gerenciamento de Grupos

### Criação e Administração Básica

```typescript
// Criar um novo grupo
const grupo = await sock.groupCreate('Grupo VIP de Estudos', [
    '5511999999999@s.whatsapp.net',
    '5511888888888@s.whatsapp.net'
])
console.log('Grupo criado com ID:', grupo.id)

// Obter metadados detalhados do grupo
const metadata = await sock.groupMetadata(grupo.id)
console.log(`Título: ${metadata.subject}, Participantes: ${metadata.participants.length}`)

// Listar todos os grupos em que você participa
const todosGrupos = await sock.groupFetchAllParticipating()

// Alterar título do grupo
await sock.groupUpdateSubject(grupo.id, 'Novo Título do Grupo')

// Alterar descrição
await sock.groupUpdateDescription(grupo.id, 'Regras atualizadas do grupo...')

// Sair do grupo
await sock.groupLeave(grupo.id)
```

### Participantes e Fila de Aprovação

```typescript
// Ações de participantes: 'add' | 'remove' | 'promote' | 'demote'
await sock.groupParticipantsUpdate(
    grupo.id,
    ['5511999999999@s.whatsapp.net'],
    'promote' // Promove para administrador
)

// Listar solicitações pendentes de aprovação de entrada
const solicitacoes = await sock.groupRequestParticipantsList(grupo.id)

// Aprovar ou rejeitar solicitações de entrada
await sock.groupRequestParticipantsUpdate(
    grupo.id,
    ['5511999999999@s.whatsapp.net'],
    'approve' // ou 'reject'
)
```

### Links de Convite

```typescript
// Obter código de convite atual
const codigo = await sock.groupInviteCode(grupo.id)
console.log('Link de convite:', `https://chat.whatsapp.com/${codigo}`)

// Revogar link de convite e gerar um novo
const novoCodigo = await sock.groupRevokeInvite(grupo.id)

// Entrar em um grupo através do código de convite
const grupoEntradoId = await sock.groupAcceptInvite('CodigoDeConviteAqui')

// Consultar informações de um grupo antes de entrar
const infoConvite = await sock.groupGetInviteInfo('CodigoDeConviteAqui')
```

### Configurações e Modos de Entrada

```typescript
// Quem pode enviar mensagens: 'announcement' (só admins) | 'not_announcement' (todos)
await sock.groupSettingUpdate(grupo.id, 'announcement')

// Quem pode editar dados do grupo: 'locked' (só admins) | 'unlocked' (todos)
await sock.groupSettingUpdate(grupo.id, 'locked')

// Quem pode adicionar participantes: 'admin_add' | 'all_member_add'
await sock.groupMemberAddMode(grupo.id, 'admin_add')

// Ativar ou desativar aprovação de entrada para novos membros
await sock.groupJoinApprovalMode(grupo.id, 'on')

// Configurar mensagens temporárias no grupo (em segundos: 86400 = 24h, 0 = desativar)
await sock.groupToggleEphemeral(grupo.id, 86400)
```

---

## 💼 WhatsApp Business & Catálogo

O WSocket suporta consultas e operações de comércio para números WhatsApp Business:

```typescript
// Consultar perfil comercial de uma conta
const perfilComercial = await sock.getBusinessProfile('5511999999999@s.whatsapp.net')
console.log('Descrição:', perfilComercial.description)
console.log('Categoria:', perfilComercial.category)

// Buscar catálogo de produtos de uma empresa
const catalogo = await sock.getCatalog({
    jid: '5511999999999@s.whatsapp.net',
    limit: 10
})

// Buscar coleções de produtos
const colecoes = await sock.getCollections('5511999999999@s.whatsapp.net')

// Criar produto no catálogo
const novoProduto = await sock.productCreate({
    name: 'Curso Avançado de TypeScript',
    description: 'Domine TypeScript do zero ao avançado',
    price: 9700, // R$ 97,00 (valor em centavos)
    currency: 'BRL',
    images: [{ url: './capa_curso.jpg' }]
})

// Atualizar produto existente
await sock.productUpdate(novoProduto.id, {
    name: 'Curso Avançado de TypeScript 2.0',
    price: 14700
})

// Excluir produtos
await sock.productDelete([novoProduto.id])
```

---

## 🔒 Presença, Chats e Privacidade

### Presença e Digitação
Indica se a conta está online, digitando ou gravando áudio (expira após cerca de 10 segundos):

```typescript
// Marcar-se online ou offline
await sock.sendPresenceUpdate('available')
await sock.sendPresenceUpdate('unavailable')

// Notificar que está digitando em um chat específico
await sock.sendPresenceUpdate('composing', jid)

// Notificar que está gravando áudio
await sock.sendPresenceUpdate('recording', jid)

// Notificar pausa na digitação
await sock.sendPresenceUpdate('paused', jid)

// Inscrever-se para escutar a presença de um contato
await sock.presenceSubscribe(jid)
```

### Leitura de Mensagens
Confirmação explícita de leitura (recibo azul):
```typescript
await sock.readMessages([mensagem.key])
```

### Modificação de Chats (`chatModify`)
Sincroniza ações de chat criptografadas via App State:

```typescript
// Arquivar conversa
await sock.chatModify({ archive: true, lastMessages: [ultimaMsg] }, jid)

// Silenciar chat por 8 horas (ou null para dessilenciar)
await sock.chatModify({ mute: 8 * 60 * 60 * 1000 }, jid)
await sock.chatModify({ mute: null }, jid) // Dessilenciar

// Marcar como não lida
await sock.chatModify({ markRead: false, lastMessages: [ultimaMsg] }, jid)

// Fixar ou desafixar conversa no topo
await sock.chatModify({ pin: true }, jid)

// Favoritar mensagem (Star)
await sock.chatModify(
    {
        star: {
            messages: [{ id: mensagem.key.id!, fromMe: mensagem.key.fromMe }],
            star: true
        }
    },
    jid
)

// Excluir mensagem apenas para mim
await sock.chatModify(
    {
        clear: {
            messages: [{ id: mensagem.key.id!, fromMe: true, timestamp: String(mensagem.messageTimestamp) }]
        }
    },
    jid
)
```

### Rejeição de Chamadas
```typescript
sock.ev.on('call', async ([call]) => {
    if (call.status === 'offer') {
        await sock.rejectCall(call.id, call.from)
    }
})
```

### Privacidade da Conta e Bloqueios

```typescript
// Bloquear ou desbloquear contato
await sock.updateBlockStatus(jid, 'block')
await sock.updateBlockStatus(jid, 'unblock')

// Obter lista de números bloqueados
const listaNegra = await sock.fetchBlocklist()

// Consultar configurações atuais de privacidade
const privacidade = await sock.fetchPrivacySettings()

// Atualizar privacidade de Visto por Último: 'all' | 'contacts' | 'contact_blacklist' | 'none'
await sock.updateLastSeenPrivacy('contacts')

// Atualizar privacidade de Online: 'all' | 'match_last_seen'
await sock.updateOnlinePrivacy('match_last_seen')

// Atualizar privacidade da Foto de Perfil: 'all' | 'contacts' | 'contact_blacklist' | 'none'
await sock.updateProfilePicturePrivacy('contacts')

// Atualizar Recibos de Leitura (Visto Azul): 'all' | 'none'
await sock.updateReadReceiptsPrivacy('all')
```

---

## 🔄 Resend de Mensagens Placeholder & Sync Sob Demanda

Quando o dispositivo secundário conecta pela primeira vez ou perde conectividade, mensagens antigas podem chegar como *placeholders* indecifráveis (`<unavailable/>`).

O WSocket inclui suporte ao protocolo PDO (*Peer Data Operation*):
```typescript
// Solicita ao celular principal o reenvio da mensagem que chegou como placeholder
const requestId = await sock.requestPlaceholderResend(mensagemPlaceholder.key)

// Sincronização sob demanda de histórico antigo
// Busca até 50 mensagens anteriores a partir de uma chave conhecida
await sock.fetchMessageHistory(50, ultimaMensagem.key, ultimaMensagem.messageTimestamp)
```

---

## ⚙️ Arquitetura Interna & Otimizações de Performance

Este fork inclui melhorias essenciais de estabilidade implementadas após rigorosa auditoria em ambientes de alta carga:

1. **Correção do Inchaço de Sender Key:**
   No Baileys original, o método de cifragem de grupo pulava iterações de chave acumulando até 2.000 chaves não utilizadas, fazendo o payload crescer para centenas de kilobytes e consumindo ~62 ms de CPU por envio. O WSocket avança a chain de forma limpa, mantendo o tamanho das chaves constante.

2. **Mutex Isolado por Chat e Autor:**
   Elimina corridas concorrentes entre o recebimento de mensagens de chave de grupo (`SKDM`) e as mensagens subsequentes (`skmsg`), garantindo que mensagens de autores distintos decifrem em paralelo enquanto a ordem por autor é preservada.

3. **Verificação Ed25519 Nativa:**
   Utiliza a API `crypto.verify` nativa do Node.js para validação de assinaturas em mensagens de grupo, reduzindo o tempo de verificação de ~6 ms para ~0,1 ms por mensagem recebida.

4. **Gerenciamento de Memória Sem Leaks:**
   Uso de `BoundedTtlMap` com teto de entradas e expiração automática, evitando vazamento de memória por `setInterval` vivos após encerramento de sockets.

5. **Edge Routing (`ED`) do WebSocket:**
   Detecção correta do roteamento do servidor WhatsApp nos protocolos `ws` e `wss`, garantindo conexão aos servidores de borda mais rápidos.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja o arquivo `LICENSE` para mais detalhes.
