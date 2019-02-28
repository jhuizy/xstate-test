import { Machine, interpret, assign, EventObject, StateSchema, State, OmniEvent } from 'xstate';
import { promisify } from 'util'
import { html, render } from 'lit-html'
import * as Rx from "rxjs"
import * as RxOp from "rxjs/operators";

interface Context {
  pricePerLitre: number;
  litres: number;
}

interface Event extends EventObject {
  type: 'LIFT' | 'UNLIFT' | 'TICK' | 'SQUEEZE' | 'UNSQUEEZE' | 'PAY' | 'PAYED';
}

interface Schema extends StateSchema {
  states: {
    up: StateSchema,
    down: StateSchema,
    pumping: StateSchema
  }
}

const stateMachine = Machine<Context, Schema, Event>({
  id: 'toggle',
  initial: 'up',
  context: {
    pricePerLitre: 1.21,
    litres: 0
  },
  states: {
    pumping: {
      on: {
        TICK: {
          actions: assign<Context>({
            litres: ctx => ctx.litres + 1
          })
        },
        UNSQUEEZE: 'up'
      }
    },
    up: {
      on: {
        SQUEEZE: 'pumping',
        UNLIFT: 'down',
      }
    },
    down: {
      on: {
        LIFT: 'up',
        PAYED: {
          actions: assign<Context>({
            litres: 0
          })
        }
      }
    }
  }
});

const service = interpret(stateMachine).start();

const template = (ctx: Context, sender: (event: OmniEvent<Event>) => void) => {

  const { pricePerLitre, litres } = ctx;
  const balance = litres * pricePerLitre;

  const liftHandler = (e: any) => { sender('LIFT') }
  const dropHandler = (e: any) => { sender('UNLIFT') }
  const pumpHandler = (e: any) => { sender('SQUEEZE') }
  const stopHandler = (e: any) => { sender('UNSQUEEZE') }
  const payHandler = (e: any) => { sender('PAY')}

  return html`
  <div>
    <span>Price Per Litre: ${pricePerLitre}</span>
    <span>Litres: ${litres}</span>
    <span>Total: ${balance}</span>
    <button @click=${liftHandler}>Lift Nozzle</button>
    <button @click=${dropHandler}>Drop Nozzle</button>
    <button @click=${pumpHandler}>Pump Nozzle</button>
    <button @click=${stopHandler}>Stop Nozzle</button>
    <button @click=${payHandler}>Pay</button>
  </div>
  `
}

Rx.interval(1000).subscribe(i => service.send('TICK'));
service.onEvent((event) => {
  if (event.type == 'PAY') {
    Rx.interval(500).pipe(RxOp.take(1)).subscribe(i => service.send('PAYED'));
  }
})

service.onChange(ctx => render(template(ctx, service.send), document.body));.z