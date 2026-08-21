const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { AiService } = require('./dist/ai/ai.service');

async function bootstrap() {
  console.log('Bootstrapping app...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const aiSvc = app.get(AiService);

  console.log('Checking embedding availability...');
  const isAvailable = await aiSvc.embeddingAvailable();
  console.log('Embedding Available:', isAvailable);

  if (isAvailable) {
    console.log('Fetching test embedding...');
    const emb = await aiSvc.getEmbedding('Test sentence for embedding.');
    if (emb) {
      console.log('Got embedding, length:', emb.length);
    } else {
      console.log('Embedding returned null.');
    }
  } else {
    console.log('No embedding key available. Checking keys in DB...');
    const keys = await aiSvc.getMasked();
    console.log(JSON.stringify(keys, null, 2));
  }

  await app.close();
}
bootstrap().catch(console.error);
