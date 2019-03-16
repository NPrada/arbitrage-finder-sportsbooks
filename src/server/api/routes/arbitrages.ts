import mongoose from 'mongoose'
import express from 'express';
const router = express.Router()


import arbSchema from '../models/arbitrages' //import the user model that allows me to interact with the db


router.get('/', (req, res, next) => {
  arbSchema.find()
    .select('-__v') //select what data you actually fetch in this case everything aside from __v
    .exec()
    .then((docs:any) => {
			// _id: mongoose.Schema.Types.ObjectId,
			// actedUpon: Boolean,
			// dateFound: mongoose.Schema.Types.Date,
			// returnOnInvestment: Number, //profit percentage
			// arb1: Number,	//arb percentage
			// bet1Data: {},
			// bet2Data: {}
      const response = {
        count: docs.length,
        arbs: docs.map((doc:any) => {
          return {
            actedUpon: doc.actedUpon,
            _id: doc._id,
            request: {
              type: 'GET',
              url: 'http:localhost:3550/users/' + doc._id,
            }
          }
        })
      }
      res.status(200).json(response)
    })
    .catch(err => {
      console.log(err)
      res.send(500).json({
        error: err
      })
    })
})

router.post('/', (req, res, next) => {
  const arb = new arbSchema({
    _id: new mongoose.Types.ObjectId(),
    name: req.body.name,
  })

  //mongoose stores this model in the db with save()
  arb
    .save()
    .then((result:any) => {
      console.log(result)
      res.status(201).json({
        message: 'Created arb successfully',
        createdArb: {
          _id: result._id,
          request: {
            type: 'POST',
            url: 'http:localhost:3550/users/' + result._id
          }
        }
      })
    })
    .catch(err => {
      console.log(err)
      res.status(500).json({error: err})
    })


})

router.get('/:arbId', (req, res, next) => {
  const id = req.params.arbId

  arbSchema.findById(id)
    .select('-__v')
    .exec()
    .then((doc:any) => {
      //console.log('From db', doc)
      if (doc) {
        let response = doc.toJSON();

        console.log('response', response)
        const updateOps:any = {}

        // send an object with the fields you wish to change
        for (const key of Object.keys(doc)) {
          updateOps[key] = doc[key]
				}
				
				res.status(200).json(response)

      } else {
        res.status(404).json({message: 'no valid entry for the id provided'})
      }

    })
    .catch(err => {
      console.log(err)
      res.status(500).json({error: err})
    })
})


router.patch('/:arbId', (req, res, next) => {
  const id = req.params.arbId;
  const updateOps:any = {}

  // send an object with the fields you wish to change
  for (const key of Object.keys(req.body)) {
    updateOps[key] = req.body[key]
  }

  arbSchema.updateOne({_id: id}, {$set: updateOps})
    .exec()
    .then(result => {
      res.status(200).json(result)
    })
    .catch(err => {
      console.log(err)
      res.status(500).json({
        error: err
      })
    })
})

router.delete('/:arbId', (req, res, next) => {
  const id = req.params.arbId
  console.log(id)
  arbSchema.deleteOne({_id: id})       //or use deleteMany
    .exec()
    .then(result => {
      res.status(200).json(result)
    })
    .catch(err => {
      console.log(err)
      res.status(500).json({
        error: err
      })
    })
})

export default router; //exports all the routes