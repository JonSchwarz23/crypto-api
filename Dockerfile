FROM buildkite/puppeteer:latest

WORKDIR /app

CMD ["npm", "run", "dev"]
