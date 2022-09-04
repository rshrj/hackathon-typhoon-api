# WebOps Hackathon 2022 - Team Typhoon

> This is the Express.js Backend REST API for the application.

## How to run

1. Clone repo locally `git clone https://github.com/rshrj/hackathon-typhoon-api.git`. And enter it `cd hackathon-typhoon-api`.
2. `npm install`.
3. Copy the `config/template.json` file to `config/default.json` and change the values appropriately. For example, `mongoUri` to a working and accessible MongoDB server.
4. Run the [nodemon](https://www.npmjs.com/package/nodemon) dev server using `npm run dev` or the production server using `npm run server`.

## Product goal:

Keep track of personal finance

## Product requirements

- Need to add expenses and split expenses with other users in a group
- Need to record transfer of money between users to settle in parts
- View reports of expenses across categories
- Set budget rules for total expenses across categories and get notifications when limits are close
- System should keep track of the money spent by each user and the money owed by users to each other
