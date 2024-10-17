extern crate embed_resource;

use std::path::Path;

fn main() {
    // 输出当前工作目录
    println!("Current directory: {:?}", std::env::current_dir().unwrap());

    // 检查 app.rc 文件是否存在
    let rc_path = Path::new("app.rc");
    if rc_path.exists() {
        println!("{:?} exists.", rc_path);
    } else {
        println!("{:?} does not exist!", rc_path);
        panic!("{:?} does not exist!", rc_path);
    }

    // 检查 icon.ico 文件是否存在
    let icon_path = Path::new("icon.ico");
    if icon_path.exists() {
        println!("{:?} exists.", icon_path);
    } else {
        println!("{:?} does not exist!", icon_path);
        panic!("{:?} does not exist!", icon_path);
    }
    embed_resource::compile("app.rc", embed_resource::NONE);
}