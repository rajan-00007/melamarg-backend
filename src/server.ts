import app from './app';
import logger from './utils/logger';
 
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';
app.listen(Number(PORT), HOST, () => {
  logger.info(`Server is running on http://${HOST}:${PORT}`);
});
