import app from './app';
import cron from 'node-cron';
import { updateInternStatuses } from './utils/updateInternStatuses';

cron.schedule('0 0 * * *', async () => {
  console.log('Running midnight status update');

  try {
    await updateInternStatuses();
    console.log('Intern statuses updated');
  } catch (err) {
    console.error(err);
  }
});
const PORT = process.env.PORT ?? 3001;
app.listen(Number(PORT), '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));
