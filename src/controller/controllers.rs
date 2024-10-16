use druid::widget::Controller;
use druid::{Env, Event, EventCtx, UpdateCtx, Widget};

pub struct Controllers<T, E, U>
where
    E: Fn(&mut EventCtx, &mut T, &Env, &Event) + 'static,
    U: Fn(&mut UpdateCtx, &T, &T) + 'static,
{
    pub(crate) mouse_move: Option<E>,
    pub(crate) mouse_dblclick: Option<E>,
    pub(crate) command: Option<E>,
    pub(crate) notification: Option<E>,

    pub(crate) update: Option<U>,
    pub(crate) _marker: std::marker::PhantomData<T>,
}

impl<T, E, U> Default for Controllers<T, E, U>
where
    E: Fn(&mut EventCtx, &mut T, &Env, &Event) + 'static,
    U: Fn(&mut UpdateCtx, &T, &T) + 'static,
{
    fn default() -> Self {
        Self {
            mouse_move: None,
            mouse_dblclick: None,
            command: None,
            notification: None,
            update: None,
            _marker: Default::default(),
        }
    }
}

impl<T, E, U> Clone for Controllers<T, E, U>
where
    E: Fn(&mut EventCtx, &mut T, &Env, &Event) + 'static + Clone,
    U: Fn(&mut UpdateCtx, &T, &T) + 'static + Clone,
{
    fn clone(&self) -> Self {
        Controllers {
            mouse_move: self.mouse_move.clone(),
            mouse_dblclick: self.mouse_dblclick.clone(),
            command: self.command.clone(),
            notification: self.notification.clone(),

            update: self.update.clone(),
            _marker: std::marker::PhantomData,
        }
    }
}

impl<T, F, U, W: Widget<T>> Controller<T, W> for Controllers<T, F, U>
where
    F: Fn(&mut EventCtx, &mut T, &Env, &Event) + 'static,
    U: Fn(&mut UpdateCtx, &T, &T) + 'static,
{
    fn event(&mut self, child: &mut W, ctx: &mut EventCtx, event: &Event, data: &mut T, env: &Env) {
        // Event::WindowConnected => {}
        // Event::WindowCloseRequested => {}
        // Event::WindowDisconnected => {}
        // Event::WindowScale(_) => {}
        // Event::WindowSize(_) => {}
        // Event::MouseUp(_) => {}
        // Event::Wheel(_) => {}
        // Event::KeyDown(_) => {}
        // Event::KeyUp(_) => {}
        // Event::Paste(_) => {}
        // Event::Zoom(_) => {}
        // Event::Timer(_) => {}
        // Event::AnimFrame(_) => {}
        // Event::ImeStateChange => {}
        // Event::Internal(_) => {}
        match event {
            Event::MouseMove(_) => {
                if let Some(mouse_move) = &self.mouse_move {
                    mouse_move(ctx, data, env, event);
                }
            }
            Event::MouseDown(mouse) => {
                if let Some(mouse_dblclick) = &self.mouse_dblclick {
                    if mouse.button.is_left() && mouse.count == 2 {
                        mouse_dblclick(ctx, data, env, event);
                    }
                }
            }
            Event::Command(_) => {
                if let Some(command) = &self.command {
                    command(ctx, data, env, event);
                }
            }
            Event::Notification(_) => {
                if let Some(notification) = &self.notification {
                    notification(ctx, data, env, event);
                }
            }
            _ => {}
        }
        child.event(ctx, event, data, env);
    }

    fn update(&mut self, child: &mut W, ctx: &mut UpdateCtx, old_data: &T, data: &T, env: &Env) {
        if let Some(update) = &self.update {
            update(ctx, old_data, data);
        }
        child.update(ctx, old_data, data, env);
    }
}