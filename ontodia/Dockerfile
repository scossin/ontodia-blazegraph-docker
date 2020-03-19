FROM node:12
ADD ./ontodia-typescript-example/ /ontodia-typescript-example/
WORKDIR /ontodia-typescript-example
RUN npm install
RUN npm run build
ENTRYPOINT ["npm", "start"]