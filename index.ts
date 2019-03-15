import { Machine, interpret, assign, EventObject, StateSchema, State, OmniEvent } from 'xstate';
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

const mkButtonSender = (cls: string, event: OmniEvent<Event>) => {
  const el = document.querySelector(`button.${cls}`);
  if (el) {
    el.addEventListener('click', (e) => {
      service.send(event);
    });
  }
}

const mkText = (cls: string, text: string) => {
  const el = document.querySelector(`span.${cls}`);
  if (el) {
    el.innerHTML = text;
  }
}

mkButtonSender('lift', 'LIFT');
mkButtonSender('drop', 'UNLIFT');
mkButtonSender('pump', 'SQUEEZE');
mkButtonSender('stop', 'UNSQUEEZE');
mkButtonSender('pay', 'PAY');

const service = interpret(stateMachine).start();

Rx.interval(1000).subscribe(i => service.send('TICK'));
service.onEvent((event) => {
  if (event.type == 'PAY') {
    Rx.interval(2000).pipe(RxOp.take(1)).subscribe(i => service.send('PAYED'));
  }
})

service.onChange((ctx: Context) => {
  const { pricePerLitre, litres }  = ctx;
  const balance = pricePerLitre * litres;
  mkText('pricePerLitre', `${pricePerLitre}`);
  mkText('litres', `${litres}`);
  mkText('balance', `${balance}`)
})