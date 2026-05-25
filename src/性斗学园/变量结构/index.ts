import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';
import { Schema } from './schema';

$(() => {
  registerMvuSchema(Schema);
  console.info('[性斗学园] MVU Schema已注册');
});
