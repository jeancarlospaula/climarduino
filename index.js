require("dotenv").config();

const five = require("johnny-five");
const scroll = require('lcd-scrolling')
const axios = require('axios').default;
const removeAccents = require('remove-accents')

const { Telegraf } = require("telegraf");

const board = new five.Board();

const bot = new Telegraf(process.env.BOT_TOKEN);

let isProcessingLastMessage = false

board.on("ready", function () {
  const lcd = new five.LCD({
    rows: 2,
    cols: 16,
    pins: [
      7,  // RS
      8,  // E
      9,  // D4
      10, // D5
      11, // D6
      12  // D7
    ],
  });

  scroll.setup({
    lcd: lcd,
  });

  lcd.cursor(0, 0).print("Envie uma cidade")

  bot.start((ctx) => ctx.reply(`Bem-vindo(a) ao ClimArduino, ${ctx.chat.first_name || ctx.chat.username}!`));

  bot.on("text", async (ctx) => {
    const message = ctx.message.text;
    const user = ctx.chat.first_name || ctx.chat.username

    console.log(`Mensagem recebida: ${message} | Usuário: ${user}`);

    try {
      if (isProcessingLastMessage) {
        console.log('Mensagem ainda em processamento')
        ctx.reply(`Aguarde alguns segundos para enviar uma nova cidade, ${user}!`);
        return
      }

      isProcessingLastMessage = true

      const response = await axios.get(`https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${message}?unitGroup=metric&key=${process.env.API_TOKEN}&contentType=json`)

      const address = removeAccents(response.data.resolvedAddress)
      const temperature = response.data.currentConditions.temp

      const displayText = `${address}: ${temperature} C`
      
      scroll.line(0, displayText);

      ctx.reply(`Previsão do tempo para ${message} já está aparecendo no display, ${user}!`);


      setInterval(() => {
        isProcessingLastMessage = false
        lcd.cursor(0, 0).print("Envie uma cidade")
      }, 30000)
    } catch (error) {
      ctx.reply(`Erro ao consultar temperatura do local informado: ${message}. Verifique se a cidade está correta.`);
    }
  });

  bot.launch();
});
