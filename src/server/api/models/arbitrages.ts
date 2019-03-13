import mongoose from 'mongoose';

//the shema defines how the object should look
const arbSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
	actedUpon: Boolean,
	dateFound: mongoose.Schema.Types.Date,
	returnOnInvestment: Number, //profit percentage
	arb1: Number,	//arb percentage
	bet1Data: {},
	bet2Data: {}
})

// egb betdata
// { sportbookId: 'egb',
//     eventName: 'WESG CS',
//     sportName: 'cs:go',
//     date: '2019-03-13T04:00:00',
//     team1: { name: 'Fnatic', odds: '1.195' },
//     team2: { name: 'Russia', odds: '3.793' }, 
//	}

//skybet betdata
// { sportbookId: 'skybet',
//     eventName: 'AEF Dota 2 PL: Premier Division',
//     sportName: 'DOTA2',
//     date: '09:00 Tuesday 19th March 2019',
//     team1: { name: 'AGN Blue', odds: '5/1' },
//     team2: { name: 'Genuine Gaming', odds: '1/9' },
//	}


//what the arbitrage function does
// arb1: marginPercent + '%', // indicates what portion your investment will take up the total winnings.
// returnOnInvestment: returnOnInvestment + '%',
// totStake: totStake,
// profit: (stake1 * ev1) - totStake,
// bet1: { odd: ev1, stake: stake1 },
// bet2: { odd: ev2, stake: stake2 }

//the model wraps it and provides you some methods to build it
export default mongoose.model('Arbitrage', arbSchema)