/* Check the comments first */

import { EventEmitter } from "./emitter";
import { EventDelayedRepository } from "./event-repository";
import { EventStatistics } from "./event-statistics";
import { ResultsTester } from "./results-tester";
import { awaitTimeout, triggerRandomly } from "./utils";

const MAX_EVENTS = 1000;

enum EventName {
  EventA = "A",
  EventB = "B",
}

const EVENT_NAMES = [EventName.EventA, EventName.EventB];

/*

  An initial configuration for this case

*/

function init() {
  const emitter = new EventEmitter<EventName>();

  triggerRandomly(() => emitter.emit(EventName.EventA), MAX_EVENTS);
  triggerRandomly(() => emitter.emit(EventName.EventB), MAX_EVENTS);

  const repository = new EventRepository();
  const handler = new EventHandler(emitter, repository);

  const resultsTester = new ResultsTester({
    eventNames: EVENT_NAMES,
    emitter,
    handler,
    repository,
  });
  resultsTester.showStats(20);
}

/* Please do not change the code above this line */
/* ----–––––––––––––––––––––––––––––––––––––---- */

/*

  The implementation of EventHandler and EventRepository is up to you.
  Main idea is to subscribe to EventEmitter, save it in local stats
  along with syncing with EventRepository.

*/

class EventHandler extends EventStatistics<EventName> {
  repository: EventRepository;
  private maxRetries = 5;
  private initialRetryDelay = 500; // 500ms
  private maxRetryDelay = 5000; // 5s

  constructor(emitter: EventEmitter<EventName>, repository: EventRepository) {
    super();
    this.repository = repository;

    emitter.subscribe(EventName.EventA, () =>
      this.handleEvent(EventName.EventA)
    );
    emitter.subscribe(EventName.EventB, () =>
      this.handleEvent(EventName.EventB)
    );
  }

  private async handleEvent(eventName: EventName) {
    this.incrementEventCount(eventName);
    await this.syncWithRepository(eventName);
  }

  private incrementEventCount(eventName: EventName) {
    this.setStats(eventName, this.getStats(eventName) + 1);
  }

  private async syncWithRepository(eventName: EventName) {
    let retryCount = 0;
    let retryDelay = this.initialRetryDelay;

    while (retryCount < this.maxRetries) {
      try {
        await this.repository.saveEventData(eventName, 1);
        break;
      } catch (error) {
        retryCount++;
        if (retryCount >= this.maxRetries) {
          console.error(
            `Failed to sync ${eventName} after ${this.maxRetries} retries`
          );
        } else {
          console.warn(`Retry ${retryCount} for ${eventName}: ${error}`);
        }
        await awaitTimeout(retryDelay);
        this.initialRetryDelay = Math.min(retryDelay * 2, this.maxRetryDelay);
      }
    }
  }
}

class EventRepository extends EventDelayedRepository<EventName> {
  async saveEventData(eventName: EventName, increment: number) {
    try {
      await this.updateEventStatsBy(eventName, increment);
    } catch (e) {
      throw e;
    }
  }
}

init();
