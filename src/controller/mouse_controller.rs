use druid::widget::Controller;
use druid::{Env, Event, EventCtx, Widget};

pub struct MouseController<T, F>
where
    F: Fn(&mut EventCtx, &mut T, &Env) + 'static,
{
    pub(crate) mouse_move: Option<F>,
    pub(crate) mouse_dblclick: Option<F>,
    pub(crate) _marker: std::marker::PhantomData<T>,
}

impl<T, F> Clone for MouseController<T, F>
where
    F: Fn(&mut EventCtx, &mut T, &Env) + 'static + Clone,
{
    fn clone(&self) -> Self {
        MouseController {
            mouse_move: self.mouse_move.clone(),
            mouse_dblclick: self.mouse_dblclick.clone(),
            _marker: std::marker::PhantomData,
        }
    }
}

impl<T, F, W: Widget<T>> Controller<T, W> for MouseController<T, F>
where
    F: Fn(&mut EventCtx, &mut T, &Env) + 'static,
{
    fn event(&mut self, child: &mut W, ctx: &mut EventCtx, event: &Event, data: &mut T, env: &Env) {
        match event {
            Event::MouseMove(_) => {
                if let Some(mouse_move) = &self.mouse_move {
                    mouse_move(ctx, data, env);
                }
            }
            Event::MouseDown(mouse) => {
                if mouse.button.is_left() && mouse.count == 2 {
                    if let Some(mouse_dblclick) = &self.mouse_dblclick {
                        mouse_dblclick(ctx, data, env);
                    }
                }
            }
            _ => {}
        }
        child.event(ctx, event, data, env);
    }
}