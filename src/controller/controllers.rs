use druid::widget::Controller;
use druid::{Env, Event, EventCtx, Widget};

pub struct Controllers<T, F>
where
    F: Fn(&mut EventCtx, &mut T, &Env) + 'static,
{
    pub(crate) mouse_move: Option<F>,
    pub(crate) mouse_dblclick: Option<F>,
    pub(crate) command: Option<F>,
    pub(crate) _marker: std::marker::PhantomData<T>,
}

impl<T, F> Clone for Controllers<T, F>
where
    F: Fn(&mut EventCtx, &mut T, &Env) + 'static + Clone,
{
    fn clone(&self) -> Self {
        Controllers {
            mouse_move: self.mouse_move.clone(),
            mouse_dblclick: self.mouse_dblclick.clone(),
            command: self.command.clone(),
            _marker: std::marker::PhantomData,
        }
    }
}

impl<T, F, W: Widget<T>> Controller<T, W> for Controllers<T, F>
where
    F: Fn(&mut EventCtx, &mut T, &Env) + 'static,
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
        // Event::Notification(_) => {}
        // Event::ImeStateChange => {}
        // Event::Internal(_) => {}
        match event {
            Event::MouseMove(_) => {
                if let Some(mouse_move) = &self.mouse_move {
                    mouse_move(ctx, data, env);
                }
            }
            Event::MouseDown(mouse) => {
                if let Some(mouse_dblclick) = &self.mouse_dblclick {
                    if mouse.button.is_left() && mouse.count == 2 {
                        mouse_dblclick(ctx, data, env);
                    }
                }
            }
            Event::Command(_) => {
                if let Some(command) = &self.command {
                    command(ctx, data, env);
                }
            }
            _ => {}
        }
        child.event(ctx, event, data, env);
    }
}