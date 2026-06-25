use std::collections::HashMap;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};

#[derive(Clone)]
pub struct CancellationToken {
    inner: Arc<AtomicBool>,
}

impl CancellationToken {
    #[allow(dead_code)]
    pub fn new() -> Self {
        Self {
            inner: Arc::new(AtomicBool::new(false)),
        }
    }

    #[allow(dead_code)]
    pub fn is_cancelled(&self) -> bool {
        self.inner.load(Ordering::Relaxed)
    }

    pub fn cancel(&self) {
        self.inner.store(true, Ordering::Relaxed);
    }
}

pub struct VideoTaskRegistry {
    tasks: Mutex<HashMap<String, CancellationToken>>,
}

impl VideoTaskRegistry {
    pub fn new() -> Self {
        Self {
            tasks: Mutex::new(HashMap::new()),
        }
    }

    /// Register a new task and return its cancellation token
    #[allow(dead_code)]
    pub fn register(&self, task_id: &str) -> CancellationToken {
        let token = CancellationToken::new();
        self.tasks
            .lock()
            .unwrap()
            .insert(task_id.to_string(), token.clone());
        token
    }

    /// Cancel a task by id
    pub fn cancel(&self, task_id: &str) -> bool {
        if let Some(token) = self.tasks.lock().unwrap().get(task_id) {
            token.cancel();
            true
        } else {
            false
        }
    }

    /// Remove a completed task
    #[allow(dead_code)]
    pub fn remove(&self, task_id: &str) {
        self.tasks.lock().unwrap().remove(task_id);
    }
}
