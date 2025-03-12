import { action, makeObservable, observable, computed } from 'mobx';

class ChatStore {
  @observable accessor sessions = new Map();
  @observable accessor selected_session_id = "";
  
  constructor() {
    makeObservable(this);
  }
  
  @computed
  get selected_session() {
    if (this.selected_session_id) {
      return this.sessions.get(this.selected_session_id)
    }
    return null
  }

  @action
  setSessions = (func) => {
    if (typeof func == 'function') {
      this.sessions = func(this.sessions)
    } else {
      this.sessions = func
    }
  }

  @action
  setSelectedSessionId = (id) => {
    this.selected_session_id = id
  }
}

export default new ChatStore();
