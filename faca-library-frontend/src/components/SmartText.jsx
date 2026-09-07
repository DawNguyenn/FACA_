import { useSmartTranslate } from '../hooks/useSmartTranslate';

/**
 * <T text="Chuỗi tiếng Việt" k="i18n.key.tuy_chon" />
 *
 * Component hiển thị văn bản theo cơ chế Hybrid Translation:
 *  1. Nếu `k` tồn tại trong dictionary i18n thủ công -> dùng bản dịch thủ công.
 *  2. Không có key -> tự động dịch sang ngôn ngữ hiện tại (en/ko) và cache lại.
 *  3. Ngôn ngữ hiện tại là 'vi' -> hiển thị văn bản gốc.
 *
 * Hỗ trợ cả children: <T>{someVietnameseText}</T>
 */
const T = ({ text, k = null, children, as: Tag = 'span', ...rest }) => {
    const { smartT } = useSmartTranslate();
    const source = children !== undefined ? String(children) : text;

    return (
        <Tag {...rest}>
            {smartT(source, k)}
        </Tag>
    );
};

export default T;
