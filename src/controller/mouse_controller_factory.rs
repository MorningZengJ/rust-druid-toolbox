use crate::controller::controllers::Controllers;
use druid::{Cursor, Env, Event, EventCtx, UpdateCtx};

pub struct MouseController;

impl MouseController {
    pub fn mouse_cursor_pointer<T>() -> Controllers<T, fn(&mut EventCtx, &mut T, &Env, &Event), fn(&mut UpdateCtx, &T, &T)> {
        Controllers {
            mouse_move: Some(|ctx: &mut EventCtx, _data: &mut T, _env: &Env, _event| {
                ctx.set_cursor(&Cursor::Pointer)
            }),
            ..Default::default()
        }
    }
}