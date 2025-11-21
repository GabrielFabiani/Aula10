var http = require('http');
var express = require('express');
var colors = require('colors');
var bodyParser = require('body-parser');
const methodOverride = require('method-override');
var path = require('path');

// --- CORREÇÃO 1: Importando MongoClient E ObjectId corretamente ---
const { MongoClient, ObjectId } = require('mongodb');

// Configurando o Banco
const uri = `mongodb+srv://gabriel_fabiani_admin:Bkb%402021@full-stack.etb8gnz.mongodb.net/?appName=Full-Stack`;
const client = new MongoClient(uri);

// Iniciando o APP
var app = express();
app.use(express.static('./public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('_method')); // Isso permite usar DELETE e PUT nos formulários
app.set('view engine', 'ejs');
app.set('views', './views');

var server = http.createServer(app);
server.listen(80);
console.log('Servidor rodando na porta 80...'.rainbow);

// Inicia na página de cadastro (conforme seu código original)
app.get('/', function (requisicao, resposta) {
    resposta.redirect('/HTML/cadastro.html');
});

//-------------------------- Cadastro --------------------------//
app.get('/cadastrar', function (requisicao, resposta) {
    resposta.sendFile(path.join(__dirname, 'public', 'HTML', 'cadastro.html'));
});

app.post('/cadastrar', async function (req, res) {
    const { nomecompleto, email, senha } = req.body;
    const novousuario = { nomecompleto, email, senha };

    try {
        await client.connect();
        const dbo = client.db("exemplo_bd");
        const usuarios = dbo.collection("usuarios");

        await usuarios.insertOne(novousuario);
        
        // Redireciona para login com aviso de sucesso
        res.redirect('/login?success=1');
    } catch (erro) {
        console.error("Erro ao cadastrar:", erro);
        res.status(500).send("Erro ao cadastrar usuário.");
    }
});
//-------------------------- FIM Cadastro --------------------------//

//-------------------------- Login --------------------------//
app.get('/login', function (requisicao, resposta) {
    resposta.sendFile(path.join(__dirname, 'public', 'HTML', 'login.html'));
});

app.post('/login', async function (requisicao, resposta) {
    const { email, senha } = requisicao.body;

    try {
        await client.connect();
        const dbo = client.db("exemplo_bd");
        const usuariosCollection = dbo.collection("usuarios");

        const usuarioEncontrado = await usuariosCollection.findOne({ email: email, senha: senha });

        let status, mensagem, mensagem2;

        if (usuarioEncontrado) {
            const nomeUsuario = usuarioEncontrado.nomecompleto || email;
            
            // --- CORREÇÃO 2: Redirecionando para '/carros' (plural) ---
            resposta.redirect(`/carros?nome=${encodeURIComponent(nomeUsuario)}`);
        } else {
            // Se falhar, poderia renderizar uma página de erro ou mandar de volta pro login
            resposta.send('<h1>Falha no Login! Email ou senha incorretos. <a href="/login">Tentar novamente</a></h1>');
        }

    } catch (erro) {
        console.error("Erro no login:", erro);
        resposta.status(500).send("Erro interno no servidor.");
    }
});
//-------------------------- FIM login --------------------------//

//-------------------------- Carros --------------------------//

// ROTA 1: Listar Carros
app.get('/carros', async function(req, res) {
    const nomeVindoDaUrl = req.query.nome; 

    try {
        // Se a conexão cair, reconecta. Se já estiver conectado, o driver gerencia.
        await client.connect(); 
        const dbo = client.db("exemplo_bd");
        const carrosCollection = dbo.collection("carros"); 

        const listaDeCarrosDoBanco = await carrosCollection.find({}).toArray();

        res.render('carros', { 
            nome: nomeVindoDaUrl, 
            listaCarros: listaDeCarrosDoBanco 
        });

    } catch (erro) {
        console.error("Erro ao buscar carros:", erro);
        res.render('carros', { 
            nome: nomeVindoDaUrl, 
            listaCarros: [] 
        });
    }
});

// ROTA 2: Cadastrar Carro
app.post('/cadastrar-carro', async (req, res) => {
    const nomeUsuario = req.query.nome;
    const { modelo, ano, quantidade } = req.body;

    try {
        const dbo = client.db("exemplo_bd");
        await dbo.collection("carros").insertOne({
            modelo: modelo,
            ano: parseInt(ano), 
            quantidade: parseInt(quantidade)
        });

        res.redirect(`/carros?nome=${nomeUsuario}`);
    } catch (erro) {
        res.send("Erro ao cadastrar: " + erro);
    }
});

// ROTA 3: VENDER CARRO (Decrementa Quantidade)
app.post('/vender-carro/:id', async (req, res) => {
    const nomeUsuario = req.query.nome;
    const idCarro = req.params.id;

    try {
        const dbo = client.db("exemplo_bd");
        // Agora ObjectId está definido e funcionará
        await dbo.collection("carros").updateOne(
            { _id: new ObjectId(idCarro) },
            { $inc: { quantidade: -1 } }
        );

        res.redirect(`/carros?nome=${nomeUsuario}`);
    } catch (erro) {
        res.send("Erro ao vender: " + erro);
    }
});

// ROTA 4: DELETAR CARRO
// Nota: Seu formulário HTML precisa ter action="...?_method=DELETE" para isso funcionar
app.delete('/deletar-carro/:id', async (req, res) => {
    const nomeUsuario = req.query.nome;
    const idCarro = req.params.id;

    try {
        const dbo = client.db("exemplo_bd");
        // Agora ObjectId está definido e funcionará
        await dbo.collection("carros").deleteOne({ _id: new ObjectId(idCarro) });

        res.redirect(`/carros?nome=${nomeUsuario}`);
    } catch (erro) {
        res.send("Erro ao deletar: " + erro);
    }
});

// --- ROTA 5: PÁGINA DE EDIÇÃO (GET) ---
// Essa rota é chamada quando você clica em "Editar" na lista
app.get('/pagina-editar/:id', async (req, res) => {
    const idCarro = req.params.id;
    const nomeUsuario = req.query.nome;

    res.redirect(`/HTML/editar_carro.html?id=${idCarro}&nome=${nomeUsuario}`);
});

// --- ROTA 6: SALVAR A EDIÇÃO (PUT) ---
app.put('/atualizar-carro/:id', async (req, res) => {
    const idCarro = req.params.id;
    const nomeUsuario = req.query.nome;
    const { novoModelo } = req.body; // Pega o que foi digitado no input

    try {
        const dbo = client.db("exemplo_bd");
        
        await dbo.collection("carros").updateOne(
            { _id: new ObjectId(idCarro) },
            { $set: { modelo: novoModelo } } // Atualiza o modelo
        );

        // Volta para a lista de carros
        res.redirect(`/carros?nome=${nomeUsuario}`);

    } catch (erro) {
        res.send("Erro ao atualizar: " + erro);
    }
});