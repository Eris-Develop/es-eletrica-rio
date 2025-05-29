const express = require('express');
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;
require('dotenv').config();

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

const pathOrcamento = path.join(__dirname, 'orcamentos');
if (!fs.existsSync(pathOrcamento)) {
  fs.mkdirSync(pathOrcamento);
}


app.post('/gerar-pdf', async (req, res) => {
  const { nome, sobrenome, email, html } = req.body;

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const estilo = `
    <style>
      body { font-family: Arial; padding: 20px; }
      h3 { color: #0a3d62; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; }
      th, td { border: 1px solid #ccc; padding: 6px; text-align: center; }
      .container-tabela { overflow-x: auto; }
    </style>
  `;

  await page.setContent(`${estilo}<div>${html}</div>`, { waitUntil: 'networkidle0' });

  const buffer = await page.pdf({
    format: 'A4',
    printBackground: true
  });

  await browser.close();

  // Salvar localmente
  const pdfPath = path.join(__dirname, `public/orcamento_${Date.now()}.pdf`);
  fs.writeFileSync(pdfPath, buffer);

  // Enviar por e-mail
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS
  }

  });

  await transporter.sendMail({
    from: 'Es Elétrica RJ <SEU_EMAIL@gmail.com>',
    to: email,
    subject: 'Seu orçamento de energia solar',
    text: `Olá ${nome}, segue em anexo o orçamento da sua usina solar. Qualquer dúvida, estamos à disposição!`,
    attachments: [
      {
        filename: 'Orcamento_EsEletricaRJ.pdf',
        path: pdfPath
      }
    ]
  });

  // Envia para download no navegador
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=Orcamento_EsEletricaRJ.pdf');
  res.send(buffer);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
