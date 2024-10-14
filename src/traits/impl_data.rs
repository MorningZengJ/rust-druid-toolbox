use druid::widget::ListIter;
use druid::Data;

#[derive(Clone)]
pub struct Vector<T>(pub im::Vector<T>);

impl<T: Data> Data for Vector<T> {
    fn same(&self, other: &Self) -> bool {
        if self.0.len() != other.0.len() {
            return false;
        }
        for (a, b) in self.0.iter().zip(other.0.iter()) {
            if !a.same(b) {
                return false;
            }
        }
        true
    }
}

// 用于迭代 Vector<T> 中的元素
impl<T: Data> ListIter<T> for Vector<T> {
    fn for_each(&self, mut cb: impl FnMut(&T, usize)) {
        for (i, item) in self.0.iter().enumerate() {
            cb(item, i);
        }
    }

    fn for_each_mut(&mut self, mut cb: impl FnMut(&mut T, usize)) {
        for (i, item) in self.0.iter_mut().enumerate() {
            cb(item, i);
        }
    }

    fn data_len(&self) -> usize {
        self.0.len()
    }
}